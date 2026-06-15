import { NextResponse } from "next/server";
import { db, users, classrooms, examAssignments, omrResults, exams } from "@yks-platform/database";
import { eq, and, gte, lte, inArray, ne } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: Request, context: { params: Promise<{ examId: string }> }) {
  try {
    const admin = await requireAdmin();
    const params = await context.params;
    const { examId } = params;

    // Parse adaptive filter query params
    const url = new URL(req.url);
    const minNet = url.searchParams.get("minNet");
    const maxNet = url.searchParams.get("maxNet");
    const examType = url.searchParams.get("examType");
    const classId = url.searchParams.get("classId");
    const minCapacity = url.searchParams.get("minCapacity");
    const maxCapacity = url.searchParams.get("maxCapacity");

    // 1. Get exam info to check type filter
    let examInfo: any = null;
    if (examType) {
      const examResult = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
      examInfo = examResult[0];
      if (examInfo && examInfo.type !== examType) {
        return NextResponse.json({ error: `Bu sınav ${examInfo.type} türünde, ${examType} filtresiyle uyuşmuyor.` }, { status: 400 });
      }
    }

    // 2. Build student list with optional net score filtering
    let studentConditions: any[] = [];
    if (admin.tenantId) studentConditions.push(eq(users.tenantId, admin.tenantId));
    studentConditions.push(eq(users.role, 'STUDENT'));
    if (classId) studentConditions.push(eq(users.classId, classId));

    let studentsList = await db.select().from(users).where(and(...studentConditions));

    // If net score filters are set, cross-reference with omrResults
    if (minNet || maxNet) {
      const resultsConditions = [ne(omrResults.examId, examId)];
      if (admin.tenantId) {
        resultsConditions.push(eq(users.tenantId, admin.tenantId));
      }

      const allResults = await db.select({
        studentId: omrResults.studentId,
        netScore: omrResults.netScore,
      })
      .from(omrResults)
      .innerJoin(users, eq(omrResults.studentId, users.id))
      .where(and(...resultsConditions));
      
      // Calculate average net score for each student across previous exams
      const studentNetScores = new Map<string, { total: number; count: number }>();
      for (const result of allResults) {
        if (!result.studentId || result.netScore === null || result.netScore === undefined) continue;
        const current = studentNetScores.get(result.studentId) || { total: 0, count: 0 };
        current.total += result.netScore;
        current.count += 1;
        studentNetScores.set(result.studentId, current);
      }

      studentsList = studentsList.filter((s) => {
        const stats = studentNetScores.get(s.id);
        if (!stats) return false;
        const average = stats.total / stats.count;
        if (minNet && average < parseFloat(minNet)) return false;
        if (maxNet && average > parseFloat(maxNet)) return false;
        return true;
      });
    }

    // 3. Build classroom list with capacity filters
    let classroomConditions: any[] = [];
    if (admin.tenantId) classroomConditions.push(eq(classrooms.tenantId, admin.tenantId));
    if (minCapacity) classroomConditions.push(gte(classrooms.capacity, parseInt(minCapacity)));
    if (maxCapacity) classroomConditions.push(lte(classrooms.capacity, parseInt(maxCapacity)));

    const classroomsList = classroomConditions.length > 0
      ? await db.select().from(classrooms).where(and(...classroomConditions))
      : await db.select().from(classrooms);

    if (classroomsList.length === 0) {
      return NextResponse.json({ error: "Filtrelere uyan derslik bulunamadı." }, { status: 400 });
    }
    if (studentsList.length === 0) {
      return NextResponse.json({ error: "Filtrelere uyan öğrenci bulunamadı." }, { status: 400 });
    }

    const totalCapacity = classroomsList.reduce((acc, c) => acc + c.capacity, 0);
    if (studentsList.length > totalCapacity) {
      return NextResponse.json({
        error: `Yetersiz kapasite: ${studentsList.length} öğrenci var ama toplam kapasite ${totalCapacity}.`
      }, { status: 400 });
    }

    // 4. Group students by classId for the butterfly (kelebek) seating algorithm
    // Shuffling students first to randomize order within each class group
    const classGroups = new Map<string, any[]>();
    const shuffledStudentsList = [...studentsList];
    for (let i = shuffledStudentsList.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledStudentsList[i], shuffledStudentsList[j]] = [shuffledStudentsList[j], shuffledStudentsList[i]];
    }

    for (const s of shuffledStudentsList) {
      const classIdKey = s.classId || 'unknown';
      const list = classGroups.get(classIdKey) || [];
      list.push(s);
      classGroups.set(classIdKey, list);
    }

    // 5. Assign to classrooms ensuring adjacent students are from different classes
    const newAssignments: { examId: string; studentId: string; classroomId: string; seatNumber: number }[] = [];

    for (const room of classroomsList) {
      let lastClassId: string | null = null;
      for (let seat = 1; seat <= room.capacity; seat++) {
        // Find classes that have remaining students and are not equal to lastClassId
        const candidateClasses = Array.from(classGroups.entries())
          .filter(([_, list]) => list.length > 0 && _ !== lastClassId);

        if (candidateClasses.length > 0) {
          // Sort candidates by remaining count descending to prioritize the largest class group
          candidateClasses.sort((a, b) => b[1].length - a[1].length);
          const [chosenClassId, list] = candidateClasses[0];
          const student = list.pop()!;
          newAssignments.push({
            examId,
            studentId: student.id,
            classroomId: room.id,
            seatNumber: seat,
          });
          lastClassId = chosenClassId;
        } else {
          // Fallback: No candidate from a different class. Pick from any class that has remaining students
          const anyLeftClasses = Array.from(classGroups.entries())
            .filter(([_, list]) => list.length > 0);

          if (anyLeftClasses.length === 0) {
            break; // No more students left to assign
          }
          const [chosenClassId, list] = anyLeftClasses[0];
          const student = list.pop()!;
          newAssignments.push({
            examId,
            studentId: student.id,
            classroomId: room.id,
            seatNumber: seat,
          });
          lastClassId = chosenClassId;
        }
      }
    }

    // 6. Wrap delete and insert operations in a transaction
    await db.transaction(async (tx) => {
      await tx.delete(examAssignments).where(eq(examAssignments.examId, examId));
      if (newAssignments.length > 0) {
        await tx.insert(examAssignments).values(newAssignments);
      }
    });

    return NextResponse.json(newAssignments);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

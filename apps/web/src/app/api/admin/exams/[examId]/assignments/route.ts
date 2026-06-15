import { NextResponse } from "next/server";
import { db, examAssignments, users, classrooms } from "@yks-platform/database";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: Request, context: { params: Promise<{ examId: string }> }) {
  try {
    await requireAdmin();
    const params = await context.params;
    const { examId } = params;

    const data = await db.select({
      id: examAssignments.id,
      examId: examAssignments.examId,
      studentId: examAssignments.studentId,
      classroomId: examAssignments.classroomId,
      seatNumber: examAssignments.seatNumber,
      studentName: users.firstName,
      studentLastName: users.lastName,
      studentEmail: users.email,
      classroomName: classrooms.name,
    })
    .from(examAssignments)
    .leftJoin(users, eq(examAssignments.studentId, users.id))
    .leftJoin(classrooms, eq(examAssignments.classroomId, classrooms.id))
    .where(eq(examAssignments.examId, examId));

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

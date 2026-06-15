import { NextResponse } from "next/server";
import { db, schedules, users, classrooms, classes, subjects } from "@yks-platform/database";
import { and, eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    
    // Join with teachers (users), classrooms, classes, and subjects to resolve display names
    const data = await db
      .select({
        id: schedules.id,
        dayOfWeek: schedules.dayOfWeek,
        startTime: schedules.startTime,
        endTime: schedules.endTime,
        teacherId: schedules.teacherId,
        teacherEmail: users.email,
        teacherFirstName: users.firstName,
        teacherLastName: users.lastName,
        classroomId: schedules.classroomId,
        classroomName: classrooms.name,
        classId: schedules.classId,
        className: classes.name,
        subjectId: schedules.subjectId,
        subjectName: subjects.name,
      })
      .from(schedules)
      .leftJoin(users, eq(schedules.teacherId, users.id))
      .leftJoin(classrooms, eq(schedules.classroomId, classrooms.id))
      .leftJoin(classes, eq(schedules.classId, classes.id))
      .leftJoin(subjects, eq(schedules.subjectId, subjects.id))
      .where(admin.tenantId ? eq(schedules.tenantId, admin.tenantId) : undefined);

    const formatted = data.map((s) => {
      let teacherName = 'Bilinmeyen Öğretmen';
      if (s.teacherFirstName || s.teacherLastName) {
        teacherName = `${s.teacherFirstName || ''} ${s.teacherLastName || ''}`.trim();
      } else if (s.teacherEmail) {
        teacherName = s.teacherEmail;
      }
      return {
        ...s,
        teacherName,
      };
    });

    return NextResponse.json(formatted);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const [newSchedule] = await db.insert(schedules).values({
      tenantId: admin.tenantId,
      classId: body.classId || null,
      teacherId: body.teacherId || null,
      classroomId: body.classroomId || null,
      subjectId: body.subjectId || null,
      dayOfWeek: parseInt(body.dayOfWeek, 10),
      startTime: body.startTime,
      endTime: body.endTime
    }).returning();

    return NextResponse.json(newSchedule);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await db.select().from(schedules).where(eq(schedules.id, id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Schedule not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(schedules).where(eq(schedules.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

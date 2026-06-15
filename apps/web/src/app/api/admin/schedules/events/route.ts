import { NextResponse } from "next/server";
import { db, lessonEvents } from "@yks-platform/database";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const data = await db.select().from(lessonEvents).where(admin.tenantId ? eq(lessonEvents.tenantId, admin.tenantId) : undefined);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const [newEvent] = await db.insert(lessonEvents).values({
      tenantId: admin.tenantId,
      teacherId: body.teacherId,
      scheduleId: body.scheduleId || null,
      classId: body.classId || null,
      classroomId: body.classroomId || null,
      type: body.type, // 'LATE_NOTICE', 'EXTRA_LESSON', 'CANCELLATION'
      date: new Date(body.date),
      startTime: body.startTime || null,
      endTime: body.endTime || null,
      note: body.note || null
    }).returning();

    return NextResponse.json(newEvent);
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

    const existing = await db.select().from(lessonEvents).where(eq(lessonEvents.id, id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Event not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(lessonEvents).where(eq(lessonEvents.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

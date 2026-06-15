import { NextResponse } from "next/server";
import { db, classrooms } from "@yks-platform/database";
import { requireAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const data = await db.select().from(classrooms).where(admin.tenantId ? eq(classrooms.tenantId, admin.tenantId) : undefined);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const [newClassroom] = await db.insert(classrooms).values({
      tenantId: admin.tenantId,
      name: body.name,
      capacity: body.capacity
    }).returning();

    return NextResponse.json(newClassroom);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await db.select().from(classrooms).where(eq(classrooms.id, id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(classrooms).where(eq(classrooms.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    if (!body.id || !body.name || !body.capacity) {
      return NextResponse.json({ error: "id, name, and capacity are required" }, { status: 400 });
    }

    const existing = await db.select().from(classrooms).where(eq(classrooms.id, body.id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Classroom not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updatedClassroom] = await db.update(classrooms)
      .set({
        name: body.name,
        capacity: Number(body.capacity)
      })
      .where(eq(classrooms.id, body.id))
      .returning();

    return NextResponse.json(updatedClassroom);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

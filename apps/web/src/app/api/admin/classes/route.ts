import { NextResponse } from "next/server";
import { db, classes } from "@yks-platform/database";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const result = admin.tenantId
      ? await db.select().from(classes).where(eq(classes.tenantId, admin.tenantId))
      : await db.select().from(classes);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();

    const [newClass] = await db.insert(classes).values({
      tenantId: admin.tenantId,
      name: body.name,
      telegramGroupId: body.telegramGroupId || null,
    }).returning();

    return NextResponse.json(newClass);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, name, telegramGroupId } = body;

    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const existing = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updatedClass] = await db.update(classes).set({
      name: name !== undefined ? name : existing[0].name,
      telegramGroupId: telegramGroupId !== undefined ? (telegramGroupId || null) : existing[0].telegramGroupId,
    }).where(eq(classes.id, id)).returning();

    return NextResponse.json(updatedClass);
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

    const existing = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    if (!existing[0]) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.delete(classes).where(eq(classes.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { db, userFeedback, users } from "@yks-platform/database";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    // Check if the record exists
    const [existing] = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        reporterTenantId: users.tenantId,
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .where(eq(userFeedback.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Geri bildirim bulunamadı." }, { status: 404 });
    }

    // Tenant check
    if (admin.tenantId && existing.reporterTenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Bu işleme yetkiniz yok." }, { status: 403 });
    }

    const { status, module, part, errorCode, description, notes } = body;

    const [updated] = await db
      .update(userFeedback)
      .set({
        status: status !== undefined ? status : undefined,
        module: module !== undefined ? module : undefined,
        part: part !== undefined ? part : undefined,
        errorCode: errorCode !== undefined ? errorCode : undefined,
        description: description !== undefined ? description : undefined,
        notes: notes !== undefined ? notes : undefined,
        updatedAt: new Date(),
      })
      .where(eq(userFeedback.id, id))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    // Check if the record exists
    const [existing] = await db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        reporterTenantId: users.tenantId,
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id))
      .where(eq(userFeedback.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Geri bildirim bulunamadı." }, { status: 404 });
    }

    // Tenant check
    if (admin.tenantId && existing.reporterTenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Bu işleme yetkiniz yok." }, { status: 403 });
    }

    await db.delete(userFeedback).where(eq(userFeedback.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

import { NextResponse } from "next/server";
import { db, userFeedback, users } from "@yks-platform/database";
import { eq, desc, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();

    const conditions = [];
    if (admin.tenantId) {
      conditions.push(eq(users.tenantId, admin.tenantId));
    }

    const query = db
      .select({
        id: userFeedback.id,
        userId: userFeedback.userId,
        email: userFeedback.email,
        errorCode: userFeedback.errorCode,
        module: userFeedback.module,
        part: userFeedback.part,
        description: userFeedback.description,
        status: userFeedback.status,
        notes: userFeedback.notes,
        createdAt: userFeedback.createdAt,
        updatedAt: userFeedback.updatedAt,
        user: {
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          role: users.role,
        },
      })
      .from(userFeedback)
      .leftJoin(users, eq(userFeedback.userId, users.id));

    const results = conditions.length > 0
      ? await query.where(and(...conditions)).orderBy(desc(userFeedback.createdAt))
      : await query.orderBy(desc(userFeedback.createdAt));

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

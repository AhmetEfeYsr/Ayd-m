import { NextResponse } from 'next/server';
import { db, users } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { getAuthClerkId, ADMIN_ROLES } from '@/lib/auth';

export async function GET() {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0] || !ADMIN_ROLES.includes(reqUser[0].role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const conditions = [eq(users.role, 'STUDENT')];
  if (reqUser[0].tenantId) conditions.push(eq(users.tenantId, reqUser[0].tenantId));

  const students = await db.select().from(users).where(and(...conditions));
  return NextResponse.json(students);
}

import { NextResponse } from 'next/server';
import { db, omrResults, users } from '@yks-platform/database';
import { eq, desc, avg, count, and } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Requesting user details
  const dbUser = await db.query.users.findFirst({
    where: eq(users.firebaseUid, userId),
  });

  if (!dbUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Conditions for results visibility
  const conditions = [eq(omrResults.examId, id)];
  if (dbUser.role === 'STUDENT') {
    conditions.push(eq(omrResults.studentId, dbUser.id));
  } else if (dbUser.role !== 'SYSTEM_ADMIN' && dbUser.tenantId) {
    conditions.push(eq(users.tenantId, dbUser.tenantId));
  }

  const results = await db
    .select({
      id: omrResults.id,
      studentId: omrResults.studentId,
      netScore: omrResults.netScore,
      answerString: omrResults.answerString,
      processedAt: omrResults.processedAt,
      studentEmail: users.email,
    })
    .from(omrResults)
    .leftJoin(users, eq(omrResults.studentId, users.id))
    .where(and(...conditions))
    .orderBy(desc(omrResults.netScore));

  // Conditions for stats comparison average
  const statsConditions = [eq(omrResults.examId, id)];
  if (dbUser.role !== 'SYSTEM_ADMIN' && dbUser.tenantId) {
    statsConditions.push(eq(users.tenantId, dbUser.tenantId));
  }

  const statsQuery = db
    .select({ avgNet: avg(omrResults.netScore), total: count() })
    .from(omrResults);

  if (dbUser.role !== 'SYSTEM_ADMIN' && dbUser.tenantId) {
    statsQuery.leftJoin(users, eq(omrResults.studentId, users.id));
  }

  const stats = await statsQuery.where(and(...statsConditions));

  return NextResponse.json({ results, stats: stats[0] });
}

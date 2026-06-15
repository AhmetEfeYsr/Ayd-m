import { NextResponse } from 'next/server';
import { db, users, omrResults, exams } from '@yks-platform/database';
import { eq, desc } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0]) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  // Check if it's the student themselves or admin of the same tenant
  const targetStudent = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (!targetStudent[0]) return NextResponse.json({ error: 'Student not found' }, { status: 404 });

  if (reqUser[0].id !== id) {
    if (!['TEACHER', 'COACH', 'INSTITUTION_ADMIN', 'PUBLISHER', 'SYSTEM_ADMIN'].includes(reqUser[0].role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (reqUser[0].tenantId && reqUser[0].tenantId !== targetStudent[0].tenantId) {
      return NextResponse.json({ error: 'Forbidden: Tenant mismatch' }, { status: 403 });
    }
  }

  const results = await db
    .select({
      id: omrResults.id,
      netScore: omrResults.netScore,
      answerString: omrResults.answerString,
      processedAt: omrResults.processedAt,
      r2StorageKey: omrResults.r2StorageKey,
      examName: exams.name,
      examType: exams.type,
      examDate: exams.date,
    })
    .from(omrResults)
    .leftJoin(exams, eq(omrResults.examId, exams.id))
    .where(eq(omrResults.studentId, id))
    .orderBy(desc(omrResults.processedAt))
    .limit(50);

  return NextResponse.json(results);
}

import { NextResponse } from 'next/server';
import { getAuthClerkId } from '@/lib/auth';
import { generate_study_plan } from '@/lib/ai/router';
import { db, users, omrResults, studentTopicMastery, topics, subjects } from '@yks-platform/database';
import { eq, desc, and, sql } from 'drizzle-orm';
import { checkAndEnforceAiLimit, rollbackAiLimit } from '@/lib/rate-limit';

export async function POST(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!dbUser[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const studentId = dbUser[0].id;

  // Her işlem için 2 kredi düşümü (oran maliyetle uyumlu hale getirilmiştir)
  const limitCheck = await checkAndEnforceAiLimit(studentId, 2, 'STUDY_PLAN', 'plan');
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.error }, { status: 402 });
  }

  try {
    const body = await req.json();
    const duration = body.duration === '1-week' ? '1-week' : '1-month';

    const recentResults = await db
      .select({ netScore: omrResults.netScore })
      .from(omrResults)
      .where(eq(omrResults.studentId, studentId))
      .orderBy(desc(omrResults.processedAt))
      .limit(10);

    const avgNet = recentResults.length > 0
      ? recentResults.reduce((sum, r) => sum + (r.netScore || 0), 0) / recentResults.length
      : 0;

    // 1. RAG Context: Fetch student's weak topics from DB where mastery < 0.5
    const dbWeakTopics = await db
      .select({ topicName: topics.name })
      .from(studentTopicMastery)
      .innerJoin(topics, eq(studentTopicMastery.topicId, topics.id))
      .where(
        and(
          eq(studentTopicMastery.studentId, studentId),
          sql`${studentTopicMastery.masteryLevel} < 0.5`
        )
      )
      .limit(10);

    const dbWeakNames = dbWeakTopics.map(t => t.topicName);

    // Combine user input zayıf konular with DB weak topics
    const combinedWeakTopics = Array.from(new Set([
      ...(body.weakTopics || []),
      ...dbWeakNames
    ]));

    // 2. RAG Context: Fetch YKS curriculum samples from DB (active subjects and topics)
    const curriculumSamples = await db
      .select({ topicName: topics.name, subjectName: subjects.name })
      .from(topics)
      .innerJoin(subjects, eq(topics.subjectId, subjects.id))
      .limit(50);

    const curriculumText = curriculumSamples
      .map(c => `${c.subjectName}: ${c.topicName}`)
      .join(', ');

    const plan = await generate_study_plan({
      currentAvgNet: avgNet,
      targetNet: body.targetNet || 100,
      weakTopics: combinedWeakTopics,
      duration,
      curriculumContext: curriculumText,
    });

    return NextResponse.json(plan);
  } catch (error: any) {
    await rollbackAiLimit(studentId, 1, 'STUDY_PLAN', limitCheck.charged || false, 'plan');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

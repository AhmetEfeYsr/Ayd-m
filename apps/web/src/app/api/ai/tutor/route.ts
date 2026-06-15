import { NextResponse } from 'next/server';
import { getAuthClerkId } from '@/lib/auth';
import { analyze_student_prompt } from '@/lib/ai/router';
import { checkAndEnforceAiLimit, rollbackAiLimit } from '@/lib/rate-limit';
import { db, users } from '@yks-platform/database';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const dbUser = await db.query.users.findFirst({
    where: eq(users.firebaseUid, userId)
  });
  if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const studentId = dbUser.id;

  // Her işlem için 1 kredi düşümü
  const limitCheck = await checkAndEnforceAiLimit(studentId, 1, 'TUTOR', 'chat');
  if (!limitCheck.allowed) {
    return NextResponse.json({ error: limitCheck.error }, { status: 402 });
  }

  try {
    const body = await req.json();
    if (!body.prompt) {
      await rollbackAiLimit(studentId, 1, 'TUTOR', limitCheck.charged || false, 'chat');
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const analysis = await analyze_student_prompt(body.prompt);
    return NextResponse.json(analysis);
  } catch (error: any) {
    await rollbackAiLimit(studentId, 1, 'TUTOR', limitCheck.charged || false, 'chat');
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

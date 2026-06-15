import { NextResponse } from 'next/server';
import { db, users, exams } from '@yks-platform/database';
import { eq, desc, or, and } from 'drizzle-orm';
import { getAuthClerkId, ADMIN_ROLES } from '@/lib/auth';

export async function GET() {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0]) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let conditions = [];
  if (reqUser[0].role === 'STUDENT') {
    if (reqUser[0].tenantId) {
      conditions.push(or(eq(exams.publisherId, reqUser[0].tenantId), eq(exams.isPublic, true)));
    } else {
      conditions.push(eq(exams.isPublic, true));
    }
  } else {
    if (reqUser[0].tenantId) {
      conditions.push(eq(exams.publisherId, reqUser[0].tenantId));
    }
  }

  const baseQuery = db.select().from(exams);
  const filtered = conditions.length > 0
    ? baseQuery.where(and(...conditions))
    : baseQuery;
  const result = await filtered.orderBy(desc(exams.date)).limit(50);

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0] || !ADMIN_ROLES.includes(reqUser[0].role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    
    if (!body || !body.name) {
      return NextResponse.json({ error: 'Sınav adı (name) zorunludur' }, { status: 400 });
    }

    const newExam = await db.insert(exams).values({
      publisherId: reqUser[0].tenantId || null,
      name: body.name,
      type: body.type || 'TYT',
      date: body.date ? new Date(body.date) : new Date(),
      isPublic: body.isPublic || false,
      answerKeyString: body.answerKeyString || null,
      topicIndexes: body.topicIndexes || null,
    }).returning();

    return NextResponse.json(newExam[0], { status: 201 });
  } catch (error: any) {
    console.error('Exam insert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

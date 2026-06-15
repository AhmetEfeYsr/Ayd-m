import { NextResponse } from 'next/server';
import { db, users, exams } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { requireAdmin, getAuthClerkId } from '@/lib/auth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0]) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const exam = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
  if (!exam[0]) return NextResponse.json({ error: 'Sınav bulunamadı' }, { status: 404 });

  // If student is fetching, ensure it's their tenant's exam or public
  if (reqUser[0].role === 'STUDENT') {
    if (exam[0].publisherId !== reqUser[0].tenantId && !exam[0].isPublic) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    // If admin/teacher is fetching, check tenant
    if (reqUser[0].tenantId && exam[0].publisherId && exam[0].publisherId !== reqUser[0].tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  return NextResponse.json(exam[0]);
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    if (!body || !body.name) {
      return NextResponse.json({ error: 'Sınav adı (name) zorunludur' }, { status: 400 });
    }

    const exam = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    if (!exam[0]) return NextResponse.json({ error: 'Sınav bulunamadı' }, { status: 404 });

    // Check tenant permissions
    if (admin.tenantId && exam[0].publisherId && exam[0].publisherId !== admin.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [updatedExam] = await db.update(exams)
      .set({
        name: body.name,
        type: body.type || exam[0].type,
        date: body.date ? new Date(body.date) : exam[0].date,
        isPublic: typeof body.isPublic === 'boolean' ? body.isPublic : exam[0].isPublic,
        answerKeyString: body.answerKeyString !== undefined ? body.answerKeyString : exam[0].answerKeyString,
        topicIndexes: body.topicIndexes !== undefined ? body.topicIndexes : exam[0].topicIndexes,
      })
      .where(eq(exams.id, id))
      .returning();

    return NextResponse.json(updatedExam);
  } catch (error: any) {
    console.error('Exam update error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;

    const exam = await db.select().from(exams).where(eq(exams.id, id)).limit(1);
    if (!exam[0]) return NextResponse.json({ error: 'Sınav bulunamadı' }, { status: 404 });

    // Check tenant permissions
    if (admin.tenantId && exam[0].publisherId && exam[0].publisherId !== admin.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.delete(exams).where(eq(exams.id, id));
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Exam delete error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

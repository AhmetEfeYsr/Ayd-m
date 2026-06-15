import { NextResponse } from 'next/server';
import { db } from '@yks-platform/database';
import { users, attendance, classes } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = await getAuthClerkId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found in database' }, { status: 404 });

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('classId');

    if (!classId) return NextResponse.json({ error: 'Class ID required' }, { status: 400 });

    if (user.role !== 'SYSTEM_ADMIN') {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'Forbidden: User has no tenant association' }, { status: 403 });
      }
      const [cls] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.tenantId, user.tenantId))).limit(1);
      if (!cls) return NextResponse.json({ error: 'Forbidden: Class does not belong to your tenant' }, { status: 403 });
    }

    const classStudents = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        studentNumber: users.studentNumber,
      })
      .from(users)
      .where(and(eq(users.classId, classId), eq(users.role, 'STUDENT')));

    return NextResponse.json({ students: classStudents });
  } catch (error) {
    console.error('Mobile Attendance GET API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getAuthClerkId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
    if (!user) return NextResponse.json({ error: 'User not found in database' }, { status: 404 });

    if (user.role !== 'TEACHER' && user.role !== 'COACH' && user.role !== 'SYSTEM_ADMIN' && user.role !== 'INSTITUTION_ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Invalid role' }, { status: 403 });
    }

    const body = await req.json();
    const { records, classId, type = 'LESSON' } = body; 

    if (!records || !classId) {
      return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
    }

    if (user.role !== 'SYSTEM_ADMIN') {
      if (!user.tenantId) {
        return NextResponse.json({ error: 'Forbidden: User has no tenant association' }, { status: 403 });
      }
      const [cls] = await db.select().from(classes).where(and(eq(classes.id, classId), eq(classes.tenantId, user.tenantId))).limit(1);
      if (!cls) return NextResponse.json({ error: 'Forbidden: Class does not belong to your tenant' }, { status: 403 });
    }

    const attendanceInsertions = records.map((record: any) => ({
      studentId: record.studentId,
      classId,
      type,
      status: record.status,
      date: new Date(),
    }));

    await db.insert(attendance).values(attendanceInsertions);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile Attendance POST API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { db, users, attendance } from '@yks-platform/database';
import { eq, desc, and, inArray } from 'drizzle-orm';
import { getAuthClerkId, ADMIN_ROLES } from '@/lib/auth';

export async function GET(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const classId = searchParams.get('classId');
  const examId = searchParams.get('examId');

  const conditions = [];
  if (classId) conditions.push(eq(attendance.classId, classId));
  if (examId) conditions.push(eq(attendance.examId, examId));

  // Eğer kullanıcı STUDENT ise sadece kendi yoklamalarını görebilmeli
  if (reqUser[0].role === 'STUDENT') {
    conditions.push(eq(attendance.studentId, reqUser[0].id));
  }

  let result;
  if (reqUser[0].tenantId) {
    // Kurum dışı öğrencilerin verilerinin sızmasını önlemek için joins kullanarak filtrele
    result = await db.select({
      id: attendance.id,
      studentId: attendance.studentId,
      classId: attendance.classId,
      examId: attendance.examId,
      type: attendance.type,
      status: attendance.status,
      date: attendance.date,
    })
    .from(attendance)
    .innerJoin(users, eq(attendance.studentId, users.id))
    .where(and(
      eq(users.tenantId, reqUser[0].tenantId),
      ...conditions
    ))
    .orderBy(desc(attendance.date))
    .limit(100);
  } else {
    // Sistem yöneticileri için (tenantId yok)
    let query = db.select().from(attendance).$dynamic();
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    result = await query.orderBy(desc(attendance.date)).limit(100);
  }

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
    const records = body.records;

    if (!records || !Array.isArray(records)) {
      return NextResponse.json({ error: 'Invalid payload: records array is required' }, { status: 400 });
    }

    if (records.length === 0) {
      return NextResponse.json({ error: 'No records to insert' }, { status: 400 });
    }

    // Tenant yetkilerini doğrula: istekteki tüm öğrencilerin bu admin ile aynı tenant'a ait olduğunu kontrol et
    if (reqUser[0].tenantId) {
      const studentIds = records.map((r: any) => r.studentId);
      const studentRecords = await db
        .select()
        .from(users)
        .where(and(
          inArray(users.id, studentIds),
          eq(users.tenantId, reqUser[0].tenantId)
        ));
      
      if (studentRecords.length !== studentIds.length) {
        return NextResponse.json({ error: 'Forbidden: One or more students belong to a different tenant' }, { status: 403 });
      }
    }

    const inserted = await db.insert(attendance).values(
      records.map((r: any) => ({
        studentId: r.studentId,
        classId: r.classId || null,
        examId: r.examId || null,
        type: r.type as 'EXAM' | 'LESSON',
        status: r.status as 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
        date: new Date(),
      }))
    ).returning();

    return NextResponse.json(inserted, { status: 201 });
  } catch (error: any) {
    console.error('Attendance insert error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

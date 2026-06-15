import { NextResponse } from 'next/server';
import { processOMRPayload } from '../sync/route';
import { verifyDesktopToken } from '@/lib/desktop-token';
import { db, users, exams } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { queueOMRProcess } from '@/lib/queue';

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function POST(req: Request) {
  try {
    // 1. Yetkilendirme Kontrolü
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized: Missing token' }, { status: 401 });
    }

    const verifiedUser = await verifyDesktopToken(token);
    if (!verifiedUser) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or expired JWT token' }, { status: 401 });
    }

    // 2. Kullanıcıyı bul ve tenant yetkilerini doğrula
    const reqUser = await db.select().from(users).where(eq(users.firebaseUid, verifiedUser.clerkId)).limit(1);
    if (!reqUser[0]) {
      return NextResponse.json({ error: 'Unauthorized: User not found in database' }, { status: 401 });
    }

    const adminTenantId = reqUser[0].tenantId;

    // 3. Masaüstünden gelen Payload'ı al ve doğrula
    const body = await req.json();
    const { studentId, examId } = body;

    if (!studentId || !examId) {
      return NextResponse.json({ error: 'studentId and examId are required' }, { status: 400 });
    }

    // Tenant Eşleşme Kontrolü: Öğrencinin bu adminin tenant'ına ait olduğunu doğrula
    let studentRecord = null;
    if (isUuid(studentId)) {
      const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
      if (student.length > 0) studentRecord = student[0];
    }
    if (!studentRecord) {
      const student = await db.select().from(users).where(eq(users.studentNumber, studentId)).limit(1);
      if (student.length > 0) studentRecord = student[0];
    }

    if (!studentRecord) {
      return NextResponse.json({ error: `Student not found: ${studentId}` }, { status: 404 });
    }

    if (adminTenantId && studentRecord.tenantId !== adminTenantId) {
      return NextResponse.json({ error: 'Forbidden: Student belongs to a different tenant' }, { status: 403 });
    }

    // Sınavın bu adminin tenant'ına ait olduğunu veya halka açık olduğunu doğrula
    let examRecord = null;
    if (isUuid(examId)) {
      const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
      if (exam.length > 0) examRecord = exam[0];
    }
    if (!examRecord) {
      const exam = await db.select().from(exams).where(eq(exams.name, examId)).limit(1);
      if (exam.length > 0) examRecord = exam[0];
    }

    if (!examRecord) {
      return NextResponse.json({ error: `Exam not found: ${examId}` }, { status: 404 });
    }

    if (adminTenantId && examRecord.publisherId && examRecord.publisherId !== adminTenantId && !examRecord.isPublic) {
      return NextResponse.json({ error: 'Forbidden: Exam does not belong to your tenant and is not public' }, { status: 403 });
    }

    // 4. QStash'e Asenkron İşlenmesi için Gönder (Publish)
    // Production ortamında QStash token'ı eksikse hata fırlat (Timeout'ları önlemek için)
    if (process.env.NODE_ENV === 'production' && !process.env.QSTASH_TOKEN) {
      throw new Error("Critical Configuration Error: QSTASH_TOKEN is missing in production.");
    }

    if (!process.env.QSTASH_TOKEN || process.env.NODE_ENV === 'development') {
      console.warn("QSTASH_TOKEN is missing or running in development. Bypassing QStash and processing synchronously.");
      await processOMRPayload(body);
      return NextResponse.json({ 
        success: true, 
        message: 'OMR veri yığını başarıyla alındı ve eşzamanlı olarak işlendi (QStash atlandı).' 
      });
    }

    await queueOMRProcess(body);

    return NextResponse.json({ 
      success: true, 
      message: 'OMR veri yığını başarıyla alındı ve işlenmek üzere sıraya (QStash) eklendi.' 
    });

  } catch (error: any) {
    console.error("Ingest endpoint hatası:", error);
    return NextResponse.json({ error: 'Failed to ingest data: ' + error.message }, { status: 500 });
  }
}

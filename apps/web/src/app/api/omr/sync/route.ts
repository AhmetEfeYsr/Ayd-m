import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { db, omrResults, users, exams } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { encryptOMRData, encryptOMRDataLegacy, uploadEncryptedOMRToR2 } from '@yks-platform/cloud';
import { queuePushNotification, queueEmailNotification } from '@/lib/queue';

function calculateNetScore(answerKey: string, studentAnswer: string): number {
  if (!answerKey || !studentAnswer) return 0;
  
  let correct = 0;
  let wrong = 0;
  
  const len = Math.min(answerKey.length, studentAnswer.length);
  for (let i = 0; i < len; i++) {
    const keyChar = answerKey[i];
    const stdChar = studentAnswer[i];
    
    // Geçersiz/iptal edilen soru ise atla
    if (keyChar === '_' || keyChar === ' ' || keyChar === '*') continue;
    // Boş bırakılmışsa atla
    if (stdChar === '_' || stdChar === ' ' || stdChar === '*') continue;
    
    if (stdChar.toUpperCase() === keyChar.toUpperCase()) {
      correct++;
    } else {
      wrong++;
    }
  }
  
  // 4 yanlış 1 doğruyu götürür
  const net = correct - (wrong * 0.25);
  return Number(Math.max(0, net).toFixed(2));
}

const isUuid = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function processOMRPayload(body: any) {
  const { studentId, examId, answerString, metrics } = body;

  if (!studentId || !examId) {
    throw new Error('studentId and examId are required');
  }

  // Öğrenciyi bul (id/uuid veya studentNumber ile)
  let studentRecord: any = null;
  
  if (isUuid(studentId)) {
    const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
    if (student.length > 0) {
      studentRecord = student[0];
    }
  }
  
  if (!studentRecord) {
    const student = await db.select().from(users).where(eq(users.studentNumber, studentId)).limit(1);
    if (student.length > 0) {
      studentRecord = student[0];
    }
  }

  if (!studentRecord) {
    throw new Error(`Student not found with ID/Number: ${studentId}`);
  }

  const resolvedStudentId = studentRecord.id;

  // Sınavı bul (id/uuid veya name ile)
  let examRecord: any = null;
  
  if (isUuid(examId)) {
    const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1);
    if (exam.length > 0) {
      examRecord = exam[0];
    }
  }
  
  if (!examRecord) {
    const exam = await db.select().from(exams).where(eq(exams.name, examId)).limit(1);
    if (exam.length > 0) {
      examRecord = exam[0];
    }
  }

  if (!examRecord) {
    throw new Error(`Exam not found with ID/Name: ${examId}`);
  }

  const resolvedExamId = examRecord.id;

  let calculatedNetScore = metrics?.netScore || 0; // Fallback

  if (examRecord.answerKeyString && answerString) {
    calculatedNetScore = calculateNetScore(examRecord.answerKeyString, answerString);
  }

  // Veriyi şifrele ve R2'ye yükle
  const dataToEncrypt = JSON.stringify(body);
  let encryptedBuffer: Buffer;
  let isHybrid = false;

  if (studentRecord.publicKey) {
    encryptedBuffer = await encryptOMRData(studentRecord.publicKey, dataToEncrypt);
    isHybrid = true;
  } else {
    encryptedBuffer = await encryptOMRDataLegacy(studentRecord.firebaseUid, dataToEncrypt);
  }
  const r2StorageKey = await uploadEncryptedOMRToR2(resolvedStudentId, resolvedExamId, encryptedBuffer);

  // Şemaya uygun şekilde DB'ye kaydet (Upsert logic)
  const existing = await db.select().from(omrResults).where(
    and(eq(omrResults.studentId, resolvedStudentId), eq(omrResults.examId, resolvedExamId))
  ).limit(1);

  const dbAnswerString = isHybrid ? null : (answerString || null);

  if (existing.length > 0) {
    await db.update(omrResults).set({
      r2StorageKey,
      answerString: dbAnswerString,
      netScore: calculatedNetScore,
      processedAt: new Date(),
    }).where(eq(omrResults.id, existing[0].id));
  } else {
    await db.insert(omrResults).values({
      studentId: resolvedStudentId,
      examId: resolvedExamId,
      r2StorageKey,
      answerString: dbAnswerString,
      netScore: calculatedNetScore,
      processedAt: new Date(),
    });
  }

  // Bildirim gönderimi: Öğrencinin push token'ı veya e-postası varsa asenkron bildirim kuyruğuna at
  const message = `${examRecord.name} sınavı okundu. Netiniz: ${calculatedNetScore}`;
  
  if (studentRecord.expoPushToken) {
    await queuePushNotification({
      userId: resolvedStudentId,
      tenantId: studentRecord.tenantId || undefined,
      title: 'Sınav Sonucunuz Açıklandı! 📝',
      message: message,
      expoPushToken: studentRecord.expoPushToken,
    });
  }

  if (studentRecord.email) {
    await queueEmailNotification({
      userId: resolvedStudentId,
      tenantId: studentRecord.tenantId || undefined,
      to: studentRecord.email,
      subject: 'Aydım - Sınav Sonucunuz',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Merhaba ${studentRecord.firstName || 'Öğrenci'},</h2>
          <p><strong>${examRecord.name}</strong> isimli sınavınız okunmuştur.</p>
          <div style="padding: 16px; background-color: #f3f4f6; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin: 0; color: #4f46e5;">Toplam Net: ${calculatedNetScore}</h3>
          </div>
          <p>Detaylı analiz için mobil veya web uygulamamızı ziyaret edebilirsiniz.</p>
        </div>
      `,
    });
  }
}

// QStash payload signature validation (güvenlik için zorunludur)
export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    console.log("QStash Worker tetiklendi. OMR verisi alınıyor...");
    await processOMRPayload(body);
    return NextResponse.json({ success: true, message: "OMR successfully processed via QStash." });
  } catch (error) {
    console.error("OMR işleme hatası:", error);
    return NextResponse.json({ error: 'Failed to process OMR chunk' }, { status: 500 });
  }
});

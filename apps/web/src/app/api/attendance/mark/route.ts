import { NextResponse } from "next/server";
import { db, attendance, users, tenants, notificationLogs } from "@yks-platform/database";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { sendBulkSms, sendWhatsAppMessage } from "@yks-platform/cloud";
import { queuePushNotification } from "@/lib/queue";

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    if (!body.studentId || !body.type || !body.status) {
      return NextResponse.json({ error: "Eksik parametreler" }, { status: 400 });
    }

    if (!['LESSON', 'EXAM'].includes(body.type) || !['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].includes(body.status)) {
      return NextResponse.json({ error: "Geçersiz type veya status" }, { status: 400 });
    }

    let conditions = [eq(users.id, body.studentId), eq(users.role, 'STUDENT')];
    if (user.tenantId) conditions.push(eq(users.tenantId, user.tenantId));

    const studentResult = await db.select().from(users).where(and(...conditions)).limit(1);
    const student = studentResult[0];

    if (!student) {
      return NextResponse.json({ error: "Öğrenci bulunamadı veya yetkiniz yok" }, { status: 404 });
    }

    const [newAttendance] = await db.insert(attendance).values({
      studentId: student.id,
      type: body.type,
      status: body.status,
    }).returning();

    if ((body.status === 'ABSENT' || body.status === 'LATE') && student.parentPhone) {
      const msgType = body.type === 'EXAM' ? 'Sınava' : 'Derse';
      const msgStatus = body.status === 'ABSENT' ? 'katılmamıştır' : 'geç kalmıştır';
      const message = `Sayın Velimiz, öğrenciniz {student_name} bugünkü ${msgType} ${msgStatus}. Bilginize sunarız.`;

      const tenant = student.tenantId ? await db.select().from(tenants).where(eq(tenants.id, student.tenantId)).limit(1) : [];

      const studentName = `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'öğrencimiz';
      const compiledMessage = message.replaceAll('{student_name}', studentName);

      // Search for a COACH user where users.parentPhone matches student.parentPhone
      const coach = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'COACH'),
            eq(users.phone, student.parentPhone)
          )
        )
        .limit(1)
        .then(rows => rows[0]);

      let sentType: 'PUSH' | 'WHATSAPP' | 'SMS' | null = null;

      // Fallback Step 1: If coach user exists and has push token, send push notification
      if (coach && coach.expoPushToken) {
        try {
          await queuePushNotification({
            userId: coach.id,
            tenantId: coach.tenantId || undefined,
            title: 'Yoklama Bildirimi',
            message: compiledMessage,
            expoPushToken: coach.expoPushToken,
          });

          await db.insert(notificationLogs).values({
            tenantId: student.tenantId,
            userId: coach.id,
            type: 'PUSH',
            status: 'SENT',
            payload: { title: 'Yoklama Bildirimi', message: compiledMessage },
          });

          sentType = 'PUSH';
        } catch (err) {
          console.error("Push Gönderim Hatası:", err);
        }
      }

      // Fallback Step 2: If no push token or push failed, call sendWhatsAppMessage
      if (!sentType) {
        try {
          const { checkAndIncrementQuota } = await import('@yks-platform/database');
          const quotaCheck = await checkAndIncrementQuota(student.tenantId, 1, 'WHATSAPP');
          
          if (!quotaCheck.allowed) {
            throw new Error(`WhatsApp Kota Sınırı Aşıldı veya Yetersiz: ${quotaCheck.error}`);
          }

          await sendWhatsAppMessage({
            tenantId: student.tenantId || '',
            phoneNumber: student.parentPhone,
            message: compiledMessage,
          });

          await db.insert(notificationLogs).values({
            tenantId: student.tenantId,
            userId: coach ? coach.id : student.id,
            type: 'WHATSAPP',
            status: 'SENT',
            payload: { message: compiledMessage },
          });

          sentType = 'WHATSAPP';
        } catch (err: any) {
          console.error("WhatsApp Gönderim Hatası:", err.message || err);
        }
      }

      // Fallback Step 3: If WhatsApp is not configured or fails, fallback to SMS
      if (!sentType) {
        try {
          const { checkAndIncrementQuota } = await import('@yks-platform/database');
          const quotaCheck = await checkAndIncrementQuota(student.tenantId, 1, 'SMS');

          if (!quotaCheck.allowed) {
            throw new Error(`SMS Kota Sınırı Aşıldı veya Yetersiz: ${quotaCheck.error}`);
          }

          await sendBulkSms({
            tenantId: student.tenantId || '',
            smsSenderId: tenant[0]?.smsSenderId || 'YKS_PLATFORM',
            templateContent: message,
            recipients: [
              {
                phoneNumber: student.parentPhone,
                variables: { student_name: studentName }
              }
            ]
          });

          await db.insert(notificationLogs).values({
            tenantId: student.tenantId,
            userId: coach ? coach.id : student.id,
            type: 'SMS',
            status: 'SENT',
            payload: { message: compiledMessage },
          });

          sentType = 'SMS';
        } catch (err: any) {
          console.error("SMS Gönderim Hatası:", err.message || err);
        }
      }
    }

    return NextResponse.json(newAttendance);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}


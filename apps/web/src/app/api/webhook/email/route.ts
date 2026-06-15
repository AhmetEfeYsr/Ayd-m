import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { filter_email_newsletter } from '@/lib/ai/router';
import { db, exams, tenants } from '@yks-platform/database';
import { eq } from 'drizzle-orm';

// Event-driven email webhook listener from Upstash QStash (EMAIL_WEBHOOK_QUEUE)
export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const emailContent = body.text || body.html;
    
    if (!emailContent) {
      return NextResponse.json({ error: 'E-posta içeriği boş.' }, { status: 400 });
    }

    console.log("QStash E-posta Yığını Tetiklendi. Analiz ediliyor...");

    // Process email using Gemini AI Task Router (Flash Lite → Flash Pro)
    const parsedData = await filter_email_newsletter(emailContent);
    
    if (parsedData && parsedData.is_important) {
      console.log('Önemli Yayınevi E-postası başarıyla analiz edildi:', parsedData);

      // Yayınevi tenant'ını bul (varsa)
      let publisherId: string | null = null;
      if (parsedData.publisher_name) {
        const publisher = await db.select({ id: tenants.id })
          .from(tenants)
          .where(eq(tenants.name, parsedData.publisher_name))
          .limit(1);

        if (publisher.length > 0) {
          publisherId = publisher[0].id;
        }
      }

      // Çıkarılan sınav verisini DB'ye kaydet
      if (parsedData.answer_key_string || parsedData.exam_name) {
        await db.insert(exams).values({
          publisherId,
          name: parsedData.exam_name || 'E-posta ile Gelen Sınav',
          type: 'TYT', // Varsayılan — AI bu bilgiyi çıkarabilir ama şimdilik sabit
          date: new Date(),
          isPublic: false,
          answerKeyString: parsedData.answer_key_string || null,
          topicIndexes: parsedData.topic_indexes || null,
        });

        console.log(`Yayınevi sınav verisi DB'ye kaydedildi: ${parsedData.exam_name}`);
      }
    } else {
      console.log('Bu e-posta önemsiz bulundu ve atlandı.');
    }
    
    return NextResponse.json({ success: true, message: "E-posta başarıyla işlendi." });
  } catch (error) {
    console.error("E-posta işleme hatası:", error);
    return NextResponse.json({ error: 'Failed to process email webhook' }, { status: 500 });
  }
});


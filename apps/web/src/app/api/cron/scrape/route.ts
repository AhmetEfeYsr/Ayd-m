import { NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { extract_omr_data } from '@/lib/ai/router';
import { db, exams } from '@yks-platform/database';

// Sınav günleri çalışacak cron-job kuyruğu (SCRAPE_JOB_QUEUE)
// QStash CRON mekanizması bu uç noktayı belirli periyotlarda (Örn: Sınav günü 18:00'da) tetikler.
export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const { url: publisherUrl, publisherId, examName, examType } = body;

    if (!publisherUrl) {
      return NextResponse.json({ error: 'Yayınevi URL\'si (url) gereklidir.' }, { status: 400 });
    }

    console.log(`QStash Cron tetiklendi. ${publisherUrl} adresi üzerinden cevap anahtarı aranıyor...`);

    // Sayfanın HTML/text versiyonunu çek
    const pageResponse = await fetch(publisherUrl, {
      headers: {
        'User-Agent': 'YKS-Platform-Bot/1.0',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!pageResponse.ok) {
      console.error(`Sayfa çekilemedi: ${pageResponse.status} — ${publisherUrl}`);
      return NextResponse.json({ error: `Sayfa erişim hatası: ${pageResponse.status}` }, { status: 502 });
    }

    const pageContent = await pageResponse.text();

    // Flash Vision AI ile metinden/görselden cevap anahtarı çıkar
    const extractedData = await extract_omr_data(pageContent);

    console.log('Yapay Zeka ile çıkarılan cevap anahtarı:', extractedData);

    // Çıkarılan veriyi exams tablosuna kaydet
    if (extractedData.answer_key_string) {
      const validExamTypes = ['TYT', 'AYT_SAY', 'AYT_EA', 'AYT_SOZ'];
      const safeExamType = validExamTypes.includes(examType) ? examType : 'TYT';

      await db.insert(exams).values({
        publisherId: publisherId || null,
        name: examName || extractedData.exam_name || 'Otomatik Çekilen Sınav',
        type: safeExamType as any,
        date: new Date(),
        isPublic: false,
        answerKeyString: extractedData.answer_key_string,
      });

      console.log(`Cevap anahtarı başarıyla DB'ye kaydedildi: ${extractedData.answer_key_string.length} soru`);
    } else {
      console.warn('Sayfadan cevap anahtarı çıkarılamadı.');
    }

    return NextResponse.json({
      success: true,
      message: 'Scraping job completed securely via QStash.',
      extracted: extractedData,
    });
  } catch (error) {
    console.error("Scraping cron hatası:", error);
    return NextResponse.json({ error: 'Failed to run scrape job' }, { status: 500 });
  }
});

// GET isteklerini de desteklemek isterseniz Vercel Cron için:
export async function GET() {
  return NextResponse.json({ message: "Cron endpoint requires POST from QStash." }, { status: 405 });
}


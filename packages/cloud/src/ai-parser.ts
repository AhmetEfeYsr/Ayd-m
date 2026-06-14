import { GoogleGenerativeAI } from '@google/generative-ai';

// Instantiate the SDK
function getGenAI() {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is missing");
  return new GoogleGenerativeAI(key);
}

export interface ParsedExamData {
  answer_key_string: string;
  topic_indexes: string[]; // Artık raw text değil, index/kod tutuyoruz (örn: "11.2")
}

/**
 * Uses Gemini Multimodal API (Pro model) to parse an uploaded file (PDF, image).
 * To reduce hallucinations, it processes questions in chunks of 40.
 *
 * @param mimeType - The mime type of the file
 * @param base64Data - Base64 encoded file data
 * @param totalQuestions - Total expected questions (used to chunk 40 by 40)
 * @param curriculumIndexMap - Optional stringified index map to guide the AI
 */
export async function parseExamFile(
  mimeType: string, 
  base64Data: string,
  totalQuestions: number,
  curriculumIndexMap: string | Record<string, string> = ""
): Promise<ParsedExamData> {
  const genAI = getGenAI();
  const modelName = process.env.MODEL_PRO || 'gemini-3.1-pro';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: { responseMimeType: 'application/json' },
  });
  
  let finalAnswerKey = "";
  const finalTopicIndexes: string[] = [];
  
  const imagePart = {
    inlineData: { data: base64Data, mimeType },
  };

  const serializedMap = typeof curriculumIndexMap === 'object'
    ? JSON.stringify(curriculumIndexMap, null, 2)
    : curriculumIndexMap;

  const chunkSize = 40;
  const chunks: { start: number; end: number; expectedCount: number }[] = [];
  for (let start = 1; start <= totalQuestions; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalQuestions);
    const expectedCount = end - start + 1;
    chunks.push({ start, end, expectedCount });
  }

  // Process all chunks in parallel using Promise.all to prevent sequential timeout issues
  const chunkResults = await Promise.all(
    chunks.map(async ({ start, end, expectedCount }) => {
      const prompt = `
Sen uzman bir MEB müfredat veri ayrıştırıcısısın.
Sana bir deneme sınavının cevap anahtarını ve kazanım tablosunu içeren bir dosya veriyorum.
Halüsinasyonu önlemek için ŞU ANDA SADECE ${start}. soru ile ${end}. soru arasındaki (bu sorular dahil) verileri çıkarmanı istiyorum.

Çıktıyı SADECE geçerli bir JSON formatında ver.

Format:
{
  "answer_key_string": "A_CBE_D...", 
  "topic_indexes": ["11.2", "12.1.3", "9.4"]
}

Kurallar:
1. answer_key_string: ${start}. ile ${end}. soruların cevaplarını sırasıyla harf (A, B, C, vb.) olarak yaz. İptal/Boş soru ise '_' koy.
2. topic_indexes: Uzun kazanım isimlerini YAZMA. Belgede kazanım numarası (örn 11.2, 11.1.2) varsa doğrudan onu al. Eğer yoksa ve uzun metin varsa, standart MEB kazanım endeks kodunu (örn: "11.2") bul ve onu yaz.
3. Çıktıdaki harf sayısı ve kazanım indeksi sayısı tam olarak ${expectedCount} adet olmalıdır.

Referans Kazanım Haritası (Index Map):
${serializedMap}
      `;

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text().trim();
      
      try {
        const parsed = JSON.parse(text) as ParsedExamData;
        
        // Validate the parsed output question count for this chunk
        if (!parsed.answer_key_string || parsed.answer_key_string.length !== expectedCount) {
          throw new Error(`AI returned ${parsed.answer_key_string?.length || 0} answers, expected ${expectedCount} for chunk ${start}-${end}`);
        }
        if (!parsed.topic_indexes || parsed.topic_indexes.length !== expectedCount) {
          throw new Error(`AI returned ${parsed.topic_indexes?.length || 0} topic indexes, expected ${expectedCount} for chunk ${start}-${end}`);
        }

        return parsed;
      } catch (error: any) {
        throw new Error(`AI parse error at questions ${start}-${end}: ${error?.message || error}. Raw output: ` + text);
      }
    })
  );

  for (const parsed of chunkResults) {
    finalAnswerKey += parsed.answer_key_string;
    finalTopicIndexes.push(...parsed.topic_indexes);
  }

  // Validate the overall parsed question count against total questions
  if (finalAnswerKey.length !== totalQuestions) {
    throw new Error(`Overall parsed answer key count (${finalAnswerKey.length}) does not match total questions (${totalQuestions})`);
  }
  if (finalTopicIndexes.length !== totalQuestions) {
    throw new Error(`Overall parsed topic indexes count (${finalTopicIndexes.length}) does not match total questions (${totalQuestions})`);
  }

  return {
    answer_key_string: finalAnswerKey,
    topic_indexes: finalTopicIndexes
  };
}

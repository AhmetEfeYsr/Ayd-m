import { NextResponse } from 'next/server';
import { db, questions, studentCredits, creditTransactions, subjects, users } from '@yks-platform/database';
import { eq, sql } from 'drizzle-orm';
import { getAuthClerkId } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAndEnforceAiLimit, rollbackAiLimit } from '@/lib/rate-limit';
import { MODEL_PRO, MODEL_VISION } from '@/lib/ai/router';

export async function POST(request: Request) {
  try {
    const clerkId = await getAuthClerkId();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { questionId, prompt } = await request.json();

    if (!questionId || !prompt) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Look up the DB user UUID using Firebase's ID
    const dbUser = await db.query.users.findFirst({
      where: eq(users.firebaseUid, clerkId)
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const studentId = dbUser.id;

    // 1. Fetch the question
    const question = await db.query.questions.findFirst({
      where: eq(questions.id, questionId)
    });

    if (!question) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    }

    // Fetch the subject to see if it is AYT Matematik or AYT Fizik
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, question.subjectId)
    });

    // Hardcode subject check based on prompt requirements
    // ayt matematik ve fizik hariç sorular 1 kredi ayt fizik ve matematik 10 kredidir (oran maliyetle uyumlu hale getirilmiştir)
    const isHighCost = subject && 
      (subject.name.toLowerCase().includes('matematik') || subject.name.toLowerCase().includes('fizik')) &&
      subject.name.toUpperCase().includes('AYT');

    const creditCost = isHighCost ? 10 : 1;

    // 2. Enforce AI limit/deduction
    const limitCheck = await checkAndEnforceAiLimit(studentId, creditCost, 'RAG', questionId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 402 });
    }

    try {
      // 3. Perform RAG (Vector Search) and generate response
      let context = `Soru ID: ${question.id}\nCevap Anahtarı: ${question.answerKey || 'Bilinmiyor'}\n`;
      if (question.embedding) {
        try {
          const vectorString = `[${question.embedding.join(',')}]`;
          const similar = await db.execute(sql`SELECT id, "r2_storage_key", "answer_key" FROM questions ORDER BY embedding <-> ${vectorString}::vector LIMIT 3`);
          
          if (similar && similar.rows.length > 0) {
            context += "\nBenzer Sorular:\n" + similar.rows.map((row: any) => `- Benzer Soru ID: ${row.id}, Cevap Anahtarı: ${row.answer_key || 'Bilinmiyor'}`).join('\n');
          }
        } catch (err) {
          console.error("Vector search failed, proceeding with original question context:", err);
        }
      }

      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        throw new Error("GEMINI_API_KEY is not set.");
      }
      const genAI = new GoogleGenerativeAI(key);
      const modelName = isHighCost ? MODEL_PRO : MODEL_VISION;
      const model = genAI.getGenerativeModel({ model: modelName });

      const apiPrompt = `Aşağıdaki soruyu ve öğrencinin sorusunu inceleyerek öğrenciye açıklayıcı bir yanıt ver.
Soru Bağlamı:
${context}

Öğrencinin Sorduğu Soru/Prompt:
${prompt}`;

      const apiResult = await model.generateContent(apiPrompt);
      const answer = apiResult.response.text();

      return NextResponse.json({ 
        answer: answer
      });
    } catch (err: any) {
      await rollbackAiLimit(studentId, creditCost, 'RAG', limitCheck.charged || false, questionId);
      throw err;
    }

  } catch (error: any) {
    if (error.message === 'Insufficient credits') {
      return NextResponse.json({ error: 'Yetersiz kredi. RAG kullanımı için daha fazla krediye ihtiyacınız var.' }, { status: 402 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

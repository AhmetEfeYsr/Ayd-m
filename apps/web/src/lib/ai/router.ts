import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

export const MODEL_LITE = "gemini-3.1-flash-lite";
export const MODEL_VISION = "gemini-3.5-flash";
export const MODEL_PRO = "gemini-3.1-pro";

// ── Typed Response Interfaces ──

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  suggested_action: string;
}

export interface OMRExtraction {
  answer_key_string: string;
  exam_name: string | null;
  publisher: string | null;
}

export interface StudyPlan {
  total_days: number;
  phases: { name: string; days: number; focus_topics: string[] }[];
  daily_hours: number;
}

export interface EmailFilterResult {
  is_important: boolean;
  publisher_name: string | null;
  exam_name: string | null;
  answer_key_string: string | null;
  topic_indexes: string[] | null;
}

// ── Model Instances (Lazy-init ile her seferinde oluşturma yok) ──

async function callOpenRouter(model: string, messages: any[], responseFormat?: any) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error("OPENROUTER_API_KEY is not set in environment variables.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aydim.com",
      "X-Title": "Aydım"
    },
    body: JSON.stringify({
      model: model,
      messages: messages,
      response_format: responseFormat,
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function getModel(modelName: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set.");
  const genAI = new GoogleGenerativeAI(key);
  return genAI.getGenerativeModel({ model: modelName });
}

// ── Yardımcı: Güvenli JSON Parse ──

function safeJsonParse<T>(text: string): T {
  // Gemini/MiniMax bazen ```json wrapper ekleyebilir, temizle
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned) as T;
}

// ── Task Router Functions ──

/**
 * Öğrenci prompt'unu analiz edip intent çıkarır (MiniMax M3 — OpenRouter).
 */
export async function analyze_student_prompt(prompt: string): Promise<IntentAnalysis> {
  const model = getModel(MODEL_VISION);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: 'Sen bir eğitim platformu asistanısın. Öğrencinin niyetini analiz et. Yanıtını SADECE JSON formatında ver: {"intent": "...", "confidence": 0.0-1.0, "suggested_action": "..."}',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
  return safeJsonParse<IntentAnalysis>(result.response.text());
}

/**
 * Görselden veya metinden OMR cevap anahtarı verisi çıkarır (Flash Vision).
 */
export async function extract_omr_data(content: string): Promise<OMRExtraction> {
  const model = getModel(MODEL_VISION);
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: content }] }],
    systemInstruction: 'Verilen içerikten OMR cevap anahtarı bilgilerini çıkar. Yanıtını SADECE JSON formatında ver: {"answer_key_string": "ABCDE...", "exam_name": "...", "publisher": "..."}. Cevap harfleri A/B/C/D/E olmalı, iptal soru için _ kullan.',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });
  return safeJsonParse<OMRExtraction>(result.response.text());
}

/**
 * 1 haftalık (7 günlük) veya 1 aylık (30 günlük) çalışma planı üretir (Gemini 3.5 Flash).
 */
export async function generate_study_plan(studentData: {
  currentAvgNet: number;
  targetNet: number;
  weakTopics: string[];
  duration: '1-week' | '1-month';
  curriculumContext?: string;
}): Promise<StudyPlan> {
  const days = studentData.duration === '1-week' ? 7 : 30;
  const periodLabel = studentData.duration === '1-week' ? '1 haftalık (7 günlük)' : '1 aylık (30 günlük)';

  const model = getModel(MODEL_VISION);
  const prompt = JSON.stringify({
    currentAvgNet: studentData.currentAvgNet,
    targetNet: studentData.targetNet,
    weakTopics: studentData.weakTopics,
    duration: studentData.duration,
    days
  });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    systemInstruction: `Sen uzman bir YKS eğitim koçusun. Öğrencinin zayıf konularına ve mevcut net ortalamasına göre ${periodLabel} bir çalışma planı oluştur.
Müfredat ve Konu Referansları (RAG): ${studentData.curriculumContext || 'Genel YKS Müfredat Konuları'}
Yanıtını SADECE JSON formatında ver: {"total_days": ${days}, "phases": [{"name": "Plan Aşaması", "days": ${days}, "focus_topics": ["..."]}], "daily_hours": 6}`,
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  return safeJsonParse<StudyPlan>(result.response.text());
}

/**
 * E-postanın önemli bir yayınevi bülteni olup olmadığını belirler.
 * Önemliyse → Pro model ile derinlemesine analiz yapar ve yapılandırılmış veri döner.
 * Önemsizse → null döner.
 */
export async function filter_email_newsletter(emailText: string): Promise<EmailFilterResult | null> {
  // 1. Adım: Flash Lite ile hızlı filtreleme
  const modelLite = getModel(MODEL_LITE);
  const filterResult = await modelLite.generateContent({
    contents: [{ role: 'user', parts: [{ text: emailText }] }],
    systemInstruction: 'Bu e-postanın bir yayınevi sınav bülteni olup olmadığını belirle. SADECE JSON ver: {"is_important": true/false, "reason": "..."}',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  const filterParsed = safeJsonParse<{ is_important: boolean }>(filterResult.response.text());

  if (!filterParsed.is_important) {
    return null;
  }

  // 2. Adım: Pro ile derinlemesine analiz
  const modelPro = getModel(MODEL_PRO);
  const analysisResult = await modelPro.generateContent({
    contents: [{ role: 'user', parts: [{ text: emailText }] }],
    systemInstruction: 'Bu yayınevi e-postasından sınav bilgilerini çıkar. SADECE JSON ver: {"is_important": true, "publisher_name": "...", "exam_name": "...", "answer_key_string": "ABCDE..." veya null, "topic_indexes": ["11.2", "12.1"] veya null}. Eğer cevap anahtarı e-postada yoksa null yaz.',
    generationConfig: {
      responseMimeType: 'application/json',
    },
  });

  return safeJsonParse<EmailFilterResult>(analysisResult.response.text());
}


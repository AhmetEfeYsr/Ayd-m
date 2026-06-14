import { sendBulkSms, SmsPayload } from "./sms-worker";
import { sendWhatsAppMessage, WhatsAppPayload } from "./whatsapp-worker";
import { parseExamFile, ParsedExamData } from "./ai-parser";
import { matchTopicsWithVectors } from "./vector-matcher";
import { sendTelegramReport, TelegramReportPayload } from "./telegram-worker";
import { getDb } from "@yks-platform/database";

interface LambdaResponse {
  statusCode: number;
  body: string;
  headers?: Record<string, string>;
}

function parseBody<T>(event: any): T {
  if (typeof event.body === "string") {
    return JSON.parse(event.body) as T;
  }
  return (event.body || event) as T;
}

function successResponse(data: any): LambdaResponse {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: true, data }),
  };
}

function errorResponse(error: any): LambdaResponse {
  return {
    statusCode: error.statusCode || 500,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ success: false, error: error.message || error }),
  };
}

export async function handleSendSms(event: any): Promise<LambdaResponse> {
  try {
    const payload = parseBody<SmsPayload>(event);
    await sendBulkSms(payload);
    return successResponse("SMS request processed successfully.");
  } catch (error: any) {
    console.error("SMS Handler Error:", error);
    return errorResponse(error);
  }
}

export async function handleSendWhatsapp(event: any): Promise<LambdaResponse> {
  try {
    const payload = parseBody<WhatsAppPayload>(event);
    await sendWhatsAppMessage(payload);
    return successResponse("WhatsApp message sent successfully.");
  } catch (error: any) {
    console.error("WhatsApp Handler Error:", error);
    return errorResponse(error);
  }
}

export async function handleAiParse(event: any): Promise<LambdaResponse> {
  try {
    const payload = parseBody<{
      mimeType: string;
      base64Data: string;
      totalQuestions: number;
      curriculumIndexMap?: string | Record<string, string>;
    }>(event);
    
    if (!payload.mimeType || !payload.base64Data || !payload.totalQuestions) {
      return errorResponse(new Error("Missing required parameters: mimeType, base64Data, totalQuestions"));
    }

    const data: ParsedExamData = await parseExamFile(
      payload.mimeType,
      payload.base64Data,
      payload.totalQuestions,
      payload.curriculumIndexMap || ""
    );
    return successResponse(data);
  } catch (error: any) {
    console.error("AI Parse Handler Error:", error);
    return errorResponse(error);
  }
}

export async function handleVectorMatch(event: any): Promise<LambdaResponse> {
  try {
    const payload = parseBody<{ topicNames: string[] }>(event);
    if (!payload.topicNames || !Array.isArray(payload.topicNames)) {
      return errorResponse(new Error("Missing parameter: topicNames (array)"));
    }
    const db = getDb();
    const matchedIds = await matchTopicsWithVectors(db, payload.topicNames);
    return successResponse(matchedIds);
  } catch (error: any) {
    console.error("Vector Match Handler Error:", error);
    return errorResponse(error);
  }
}

export async function handleTelegramReport(event: any): Promise<LambdaResponse> {
  try {
    const payload = parseBody<TelegramReportPayload>(event);
    await sendTelegramReport(payload);
    return successResponse("Telegram report sent successfully.");
  } catch (error: any) {
    console.error("Telegram Report Handler Error:", error);
    return errorResponse(error);
  }
}

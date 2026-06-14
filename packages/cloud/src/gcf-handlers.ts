import { sendBulkSms, SmsPayload } from "./sms-worker";
import { sendWhatsAppMessage, WhatsAppPayload } from "./whatsapp-worker";
import { parseExamFile, ParsedExamData } from "./ai-parser";
import { matchTopicsWithVectors } from "./vector-matcher";
import { sendTelegramReport, TelegramReportPayload } from "./telegram-worker";
import { getDb } from "@yks-platform/database";

function handleCors(req: any, res: any): boolean {
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Access-Control-Max-Age", "3600");
    res.status(204).send("");
    return true;
  }
  return false;
}

export async function gcfSendSms(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    const payload = req.body as SmsPayload;
    await sendBulkSms(payload);
    res.status(200).json({ success: true, message: "SMS request processed successfully." });
  } catch (error: any) {
    console.error("GCF SMS Error:", error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}

export async function gcfSendWhatsapp(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    const payload = req.body as WhatsAppPayload;
    await sendWhatsAppMessage(payload);
    res.status(200).json({ success: true, message: "WhatsApp message sent successfully." });
  } catch (error: any) {
    console.error("GCF WhatsApp Error:", error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}

export async function gcfAiParse(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    const payload = req.body as {
      mimeType: string;
      base64Data: string;
      totalQuestions: number;
      curriculumIndexMap?: string | Record<string, string>;
    };

    if (!payload.mimeType || !payload.base64Data || !payload.totalQuestions) {
      return res.status(400).json({ success: false, error: "Missing required parameters: mimeType, base64Data, totalQuestions" });
    }

    const data: ParsedExamData = await parseExamFile(
      payload.mimeType,
      payload.base64Data,
      payload.totalQuestions,
      payload.curriculumIndexMap || ""
    );
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error("GCF AI Parse Error:", error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}

export async function gcfVectorMatch(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    const payload = req.body as { topicNames: string[] };
    if (!payload.topicNames || !Array.isArray(payload.topicNames)) {
      return res.status(400).json({ success: false, error: "Missing parameter: topicNames (array)" });
    }
    const db = getDb();
    const matchedIds = await matchTopicsWithVectors(db, payload.topicNames);
    res.status(200).json({ success: true, data: matchedIds });
  } catch (error: any) {
    console.error("GCF Vector Match Error:", error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}

export async function gcfTelegramReport(req: any, res: any) {
  if (handleCors(req, res)) return;
  try {
    const payload = req.body as TelegramReportPayload;
    await sendTelegramReport(payload);
    res.status(200).json({ success: true, message: "Telegram report sent successfully." });
  } catch (error: any) {
    console.error("GCF Telegram Report Error:", error);
    res.status(500).json({ success: false, error: error.message || error });
  }
}

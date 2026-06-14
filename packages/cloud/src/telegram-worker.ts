/**
 * Telegram Asynchronous Worker for sending Class Reports
 * This function should be triggered via a queue (e.g. Google Cloud Tasks or Upstash QStash)
 */

export interface TelegramReportPayload {
  telegramGroupId: string;
  className: string;
  examName: string;
  averageNetScore: number;
  participationCount: number;
  summaryReport?: string;
}

export type TelegramWorkerPayload = TelegramReportPayload;

/**
 * Escapes HTML characters (<, >, &) to prevent Telegram API formatting issues.
 */
function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Sends a formatted report message to a specific Telegram Group using the Telegram Bot API.
 * 
 * @param payload - The data needed to construct the report message
 */
export async function sendTelegramReport(payload: TelegramReportPayload): Promise<void> {
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  
  if (!telegramBotToken) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set.');
  }

  const { telegramGroupId, className, examName, averageNetScore, participationCount, summaryReport } = payload;

  if (!telegramGroupId) {
    console.warn(`No telegramGroupId provided for class ${className}. Skipping notification.`);
    return;
  }

  const safeClassName = escapeHTML(className);
  const safeExamName = escapeHTML(examName);
  const safeSummaryReport = summaryReport ? escapeHTML(summaryReport) : '';

  // Construct a polished, readable report message in HTML format
  const messageText = `
📊 <b>Sınav Raporu: ${safeClassName}</b>
📝 <b>Sınav:</b> ${safeExamName}
👥 <b>Katılım:</b> ${participationCount} Öğrenci

📈 <b>Sınıf Ortalaması:</b> ${averageNetScore.toFixed(2)} Net

${summaryReport ? `\n📌 <b>Analiz:</b>\n${safeSummaryReport}` : ''}
  `.trim();

  const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: telegramGroupId,
        text: messageText,
        parse_mode: 'HTML',
      }),
    });

    if (!response.ok) {
      const responseText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { rawText: responseText };
      }
      throw new Error(`Telegram API Error: ${JSON.stringify(errorData)}`);
    }

    console.log(`Telegram report successfully sent to group ${telegramGroupId} for class ${className}.`);
  } catch (error) {
    console.error('Failed to send Telegram report:', error);
    throw error;
  }
}


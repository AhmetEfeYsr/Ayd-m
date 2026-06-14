/**
 * Asynchronous SMS Worker for sending bulk notifications
 * Supports attendance notifications (e.g. absent from exam/lesson) and general bulk messages.
 */

export interface SmsPayload {
  tenantId: string;
  smsSenderId: string; // The alphanumeric sender ID (e.g., EGITIM_KURUMU)
  templateContent: string; // "Sayın velimiz, öğrenciniz {student_name}..."
  recipients: {
    phoneNumber: string; // "905XXXXXXXXX"
    variables: Record<string, string>; // { "student_name": "Ahmet Yılmaz", "exam_name": "3D TYT" }
  }[];
}

/**
 * Sends SMS notifications using a generic SMS Gateway API.
 * This should be triggered from a Queue (Google Cloud Tasks or QStash) to prevent blocking the UI.
 */
export async function sendBulkSms(payload: SmsPayload): Promise<void> {
  let smsUsername = process.env.SMS_API_USER;
  let smsPassword = process.env.SMS_API_PASS;
  let smsSenderId = payload.smsSenderId;
  let smsEndpoint = process.env.SMS_API_ENDPOINT || "https://api.netgsm.com.tr/sms/send";

  if (payload.tenantId) {
    try {
      const { getDb, tenants } = await import('@yks-platform/database');
      const { eq } = await import('drizzle-orm');
      const database = getDb();
      const [tenant] = await database.select().from(tenants).where(eq(tenants.id, payload.tenantId)).limit(1);
      if (tenant) {
        if (tenant.smsUsername) {
          smsUsername = tenant.smsUsername;
        }
        if (tenant.smsPassword) {
          smsPassword = tenant.smsPassword;
        }
        if (tenant.smsSenderId) {
          smsSenderId = tenant.smsSenderId;
        }
      }
    } catch (dbErr) {
      console.warn("Failed to fetch custom SMS credentials from db, falling back to env:", dbErr);
    }
  }

  if (!smsUsername || !smsPassword) {
    throw new Error("SMS Provider credentials are not set. Cannot send SMS.");
  }

  // Pre-process the recipients to compile the final messages, filtering out null/empty numbers
  const compiledMessages = payload.recipients
    .filter(recipient => recipient.phoneNumber && recipient.phoneNumber.trim() !== '')
    .map((recipient) => {
      let messageBody = payload.templateContent;
      
      // Replace all variables in the template (e.g. {student_name} -> Ahmet Yılmaz)
      for (const [key, value] of Object.entries(recipient.variables)) {
        messageBody = messageBody.replaceAll(`{${key}}`, value);
      }

      return {
        to: recipient.phoneNumber,
        text: messageBody,
      };
    });

  if (compiledMessages.length === 0) {
    console.log(`No valid phone numbers found for SMS Sender: ${smsSenderId}`);
    return;
  }

  console.log(`Prepared ${compiledMessages.length} SMS messages for Sender: ${smsSenderId}`);

  // This part depends on the specific SMS provider's API structure (e.g. Mutlucell, NetGSM, Twilio).
  // This is a generic standard payload representation.
  const apiPayload = {
    username: smsUsername,
    password: smsPassword,
    header: smsSenderId, // The alphanumeric Title (EĞİTİM_KURUMU_İSMİ)
    messages: compiledMessages.map(m => ({
      msg: m.text,
      no: m.to
    }))
  };

  try {
    const response = await fetch(smsEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`SMS Provider HTTP Error (Status: ${response.status}): ${responseText}`);
    }

    let hasError = false;
    let errorMessage = '';

    try {
      const parsed = JSON.parse(responseText);
      if (parsed && typeof parsed === 'object') {
        if (parsed.code && parsed.code !== '00') {
          hasError = true;
          errorMessage = `NetGSM Error Code: ${parsed.code}. Description: ${parsed.description || 'No description'}`;
        }
      }
    } catch {
      // Not a JSON response, parse as plain text
      const cleanText = responseText.trim();
      if (!cleanText.startsWith('00') && cleanText !== '00') {
        hasError = true;
        errorMessage = `NetGSM Error Response: ${cleanText}`;
      }
    }

    if (hasError) {
      throw new Error(errorMessage);
    }

    console.log(`Successfully sent ${compiledMessages.length} SMS notifications. Response: ${responseText.trim()}`);
  } catch (error) {
    console.error('Failed to send SMS notifications:', error);
    throw error; // Let the queue retry if it fails
  }
}

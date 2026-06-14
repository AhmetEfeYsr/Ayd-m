/**
 * Asynchronous WhatsApp Worker for sending notifications.
 * Supports sending attendance alerts and other messages via WhatsApp Business API.
 */

export interface WhatsAppPayload {
  tenantId: string;
  phoneNumber: string; // "905XXXXXXXXX"
  message: string;
}

/**
 * Sends a WhatsApp message using the WhatsApp Business / HTTP API.
 */
export async function sendWhatsAppMessage(payload: WhatsAppPayload): Promise<void> {
  let whatsappApiEndpoint = process.env.WHATSAPP_API_ENDPOINT;
  let whatsappApiToken = process.env.WHATSAPP_API_TOKEN;

  if (payload.tenantId) {
    try {
      const { getDb, tenants } = await import('@yks-platform/database');
      const { eq } = await import('drizzle-orm');
      const database = getDb();
      const [tenant] = await database.select().from(tenants).where(eq(tenants.id, payload.tenantId)).limit(1);
      if (tenant) {
        if (tenant.whatsappApiEndpoint) {
          whatsappApiEndpoint = tenant.whatsappApiEndpoint;
        }
        if (tenant.whatsappApiToken) {
          whatsappApiToken = tenant.whatsappApiToken;
        }
      }
    } catch (dbErr) {
      console.warn("Failed to fetch custom WhatsApp credentials from db, falling back to env:", dbErr);
    }
  }

  if (!whatsappApiEndpoint || !whatsappApiToken) {
    console.warn("WhatsApp API credentials are not set.");
    throw new Error("WhatsApp Provider credentials are not set. Cannot send WhatsApp message.");
  }

  // Normalize phone number to only contain digits
  const cleanPhone = payload.phoneNumber.replace(/\D/g, '');

  if (!cleanPhone) {
    throw new Error("Invalid phone number provided for WhatsApp message.");
  }

  console.log(`Sending WhatsApp message to ${cleanPhone} for Tenant: ${payload.tenantId}`);

  // Standard WhatsApp Business Cloud API JSON payload
  const apiPayload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: cleanPhone,
    type: "text",
    text: {
      preview_url: false,
      body: payload.message
    }
  };

  try {
    const response = await fetch(whatsappApiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${whatsappApiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(apiPayload),
    });

    const responseText = await response.text();

    if (!response.ok) {
      throw new Error(`WhatsApp API HTTP Error (Status: ${response.status}): ${responseText}`);
    }

    console.log(`Successfully sent WhatsApp message. Response: ${responseText.trim()}`);
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error);
    throw error;
  }
}

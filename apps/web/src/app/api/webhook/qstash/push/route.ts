import { NextResponse } from 'next/server';
import { db } from '@yks-platform/database';
import { notificationLogs } from '@yks-platform/database';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { uploadNotificationPayloadToR2 } from '@yks-platform/cloud';
import crypto from 'crypto';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const { userId, tenantId, title, message, expoPushToken } = body;

    if (!expoPushToken) {
      return NextResponse.json({ error: 'No Expo Push Token provided' }, { status: 400 });
    }

    // Call Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: expoPushToken,
        title: title || 'Yeni Bildirim',
        body: message,
        data: { userId, tenantId },
      }),
    });

    const receipt = await response.json();
    const logId = crypto.randomUUID();
    const payload = { title, message, receipt };
    
    // Upload push metadata and receipt payload to R2
    const r2PayloadKey = await uploadNotificationPayloadToR2(logId, payload);

    // Log notification
    await db.insert(notificationLogs).values({
      id: logId,
      userId,
      tenantId,
      type: 'PUSH',
      status: response.ok ? 'SENT' : 'FAILED',
      payload: { title, message }, // Keep it lightweight in Neon
      r2PayloadKey,
    });

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    console.error('Push webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});

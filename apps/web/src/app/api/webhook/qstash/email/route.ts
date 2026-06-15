import { NextResponse } from 'next/server';
import { db } from '@yks-platform/database';
import { notificationLogs } from '@yks-platform/database';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { uploadNotificationPayloadToR2 } from '@yks-platform/cloud';
import crypto from 'crypto';

export const POST = verifySignatureAppRouter(async (req: Request) => {
  try {
    const body = await req.json();
    const { userId, tenantId, to, subject, html } = body;

    if (!to) {
      return NextResponse.json({ error: 'No recipient email provided' }, { status: 400 });
    }

    const logId = crypto.randomUUID();
    const payload = { to, subject, html };
    
    // Upload heavy HTML payload to Cloudflare R2
    const r2PayloadKey = await uploadNotificationPayloadToR2(logId, payload);

    // E-postayı yerel göndericinin (SMTP) çekebilmesi için PENDING olarak kuyruğa ekle
    await db.insert(notificationLogs).values({
      id: logId,
      userId,
      tenantId,
      type: 'EMAIL',
      status: 'PENDING',
      payload: { to, subject }, // Keep it lightweight in Neon
      r2PayloadKey,
    });

    console.log(`Email queued as PENDING for recipient: ${to} with R2 key: ${r2PayloadKey}`);

    return NextResponse.json({ success: true, queued: true });
  } catch (error) {
    console.error('Email webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
});


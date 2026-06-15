import { Client } from '@upstash/qstash';
import { Redis } from '@upstash/redis';

export const qstash = new Client({
  token: process.env.QSTASH_TOKEN!,
});

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const OMR_PROCESS_QUEUE = 'OMR_PROCESS_QUEUE';
export const EMAIL_WEBHOOK_QUEUE = 'EMAIL_WEBHOOK_QUEUE';
export const SCRAPE_JOB_QUEUE = 'SCRAPE_JOB_QUEUE';

/** VERCEL_URL protokol içermez, NEXT_PUBLIC_APP_URL tam URL olmalı */
function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export async function queueOMRProcess(data: any) {
  return await qstash.publishJSON({
    url: `${getBaseUrl()}/api/omr/sync`,
    body: data,
    queue: OMR_PROCESS_QUEUE,
  });
}

export async function queueEmailParse(emailData: any) {
  return await qstash.publishJSON({
    url: `${getBaseUrl()}/api/webhook/email`,
    body: emailData,
    queue: EMAIL_WEBHOOK_QUEUE,
  });
}

export async function queuePushNotification(payload: {
  userId: string;
  tenantId?: string;
  title: string;
  message: string;
  expoPushToken: string;
}) {
  return await qstash.publishJSON({
    url: `${getBaseUrl()}/api/webhook/qstash/push`,
    body: payload,
  });
}

export async function queueEmailNotification(payload: {
  userId: string;
  tenantId?: string;
  to: string;
  subject: string;
  html: string;
}) {
  return await qstash.publishJSON({
    url: `${getBaseUrl()}/api/webhook/qstash/email`,
    body: payload,
  });
}

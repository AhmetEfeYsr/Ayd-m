import { z } from 'zod';

/**
 * Sunucu tarafı ortam değişkenleri validasyonu.
 * Build time'da veya ilk import'ta tüm eksik/hatalı değişkenler yakalanır.
 * 
 * Kullanım: import { env } from '@/lib/env';
 */

const serverSchema = z.object({
  // ── Veritabanı ──
  DATABASE_URL: z.string().url('DATABASE_URL geçerli bir PostgreSQL bağlantı adresi olmalıdır.'),

  // ── Firebase Auth ──
  FIREBASE_PROJECT_ID: z.string().min(1, 'FIREBASE_PROJECT_ID tanımlı olmalıdır.'),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, 'FIREBASE_CLIENT_EMAIL tanımlı olmalıdır.'),
  FIREBASE_PRIVATE_KEY: z.string().min(1, 'FIREBASE_PRIVATE_KEY tanımlı olmalıdır.'),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_API_KEY tanımlı olmalıdır.'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN tanımlı olmalıdır.'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_PROJECT_ID tanımlı olmalıdır.'),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1, 'NEXT_PUBLIC_FIREBASE_APP_ID tanımlı olmalıdır.'),

  // ── Gemini AI ──
  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY tanımlı olmalıdır.'),
  OPENROUTER_API_KEY: z.string().optional(),

  // ── Şifreleme & API ──
  MASTER_SALT: z.string().min(16, 'MASTER_SALT en az 16 karakter olmalıdır.'),
  DESKTOP_API_SECRET: z.string().optional(),

  // ── Cloudflare R2 ──
  CLOUDFLARE_ACCOUNT_ID: z.string().min(1, 'CLOUDFLARE_ACCOUNT_ID tanımlı olmalıdır.'),
  R2_ACCESS_KEY_ID: z.string().min(1, 'R2_ACCESS_KEY_ID tanımlı olmalıdır.'),
  R2_SECRET_ACCESS_KEY: z.string().min(1, 'R2_SECRET_ACCESS_KEY tanımlı olmalıdır.'),
  R2_BUCKET_NAME: z.string().default('omr-results'),
  R2_QUESTION_BUCKET_NAME: z.string().default('question-bank'),

  // ── Upstash QStash & Redis ──
  QSTASH_TOKEN: z.string().min(1, 'QSTASH_TOKEN tanımlı olmalıdır.'),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1, 'QSTASH_CURRENT_SIGNING_KEY tanımlı olmalıdır.'),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1, 'QSTASH_NEXT_SIGNING_KEY tanımlı olmalıdır.'),
  UPSTASH_REDIS_REST_URL: z.string().url('UPSTASH_REDIS_REST_URL geçerli bir URL olmalıdır.'),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, 'UPSTASH_REDIS_REST_TOKEN tanımlı olmalıdır.'),

  // ── Telegram ──
  TELEGRAM_BOT_TOKEN: z.string().optional(),

  // ── SMS Provider ──
  SMS_API_ENDPOINT: z.string().url().optional(),
  SMS_API_USER: z.string().optional(),
  SMS_API_PASS: z.string().optional(),

  // ── WhatsApp ──
  WHATSAPP_API_ENDPOINT: z.string().url().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),

  // ── Uygulama URL ──
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  VERCEL_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
});

function validateEnv() {
  const parsed = serverSchema.safeParse(process.env);

  if (!parsed.success) {
    const formatted = parsed.error.issues
      .map((issue) => `  ✗ ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    console.error(
      '\n╔══════════════════════════════════════════════════════════════╗\n' +
      '║  ❌ Eksik veya hatalı ortam değişkenleri tespit edildi:     ║\n' +
      '╚══════════════════════════════════════════════════════════════╝\n\n' +
      formatted + '\n'
    );

    throw new Error('Ortam değişkenleri doğrulaması başarısız oldu. Yukarıdaki hataları düzeltin.');
  }

  return parsed.data;
}

export const env = validateEnv();

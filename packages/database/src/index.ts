import { neon } from '@neondatabase/serverless';
import { drizzle, NeonHttpDatabase } from 'drizzle-orm/neon-http';
import { eq, and, sql } from 'drizzle-orm';
import * as schema from './schema';

// Lazy singleton — bağlantı ilk kullanımda oluşturulur, import anında değil
let _db: NeonHttpDatabase<typeof schema> | null = null;

export function getDb(): NeonHttpDatabase<typeof schema> {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        'DATABASE_URL environment variable is required. ' +
        'Check your .env file or deployment configuration.'
      );
    }
    _db = drizzle(neon(url), { schema });
  }
  return _db;
}

// Backward-compatible default export — mevcut tüm consumer'lar `db` kullanıyor
// Not: Bu hâlâ import anında evaluate edilir ama hata mesajı artık açıklayıcı
const url = process.env.DATABASE_URL;
if (!url) {
  console.warn(
    '[database] WARNING: DATABASE_URL is not set. ' +
    'Database queries will fail. Set DATABASE_URL in your .env file.'
  );
}
export const db = url ? drizzle(neon(url), { schema }) : null as unknown as NeonHttpDatabase<typeof schema>;

/**
 * Checks if a tenant has enough quota to send SMS or WhatsApp messages this year
 * and increments their usage if allowed. Enforces standard limits (30/student/year)
 * and premium limits (200/student/year) based on the subscription plan.
 */
export async function checkAndIncrementQuota(
  tenantId: string | null,
  requestedCount: number,
  type: 'SMS' | 'WHATSAPP'
): Promise<{ allowed: boolean; error?: string; usage?: number; limit?: number }> {
  if (!tenantId) return { allowed: true };

  const database = getDb();
  const { tenants, users } = schema;

  // 1. Kurum bilgisini getir
  const [tenant] = await database.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
  if (!tenant) {
    return { allowed: false, error: 'Kurum veritabanında bulunamadı.' };
  }

  // 2. Yıllık sıfırlama zamanı kontrolü (Sütun isimleri geriye dönük uyumluluk için korunmuştur)
  const now = new Date();
  let currentSms = tenant.smsSentThisMonth;
  let currentWhatsapp = tenant.whatsappSentThisMonth;
  
  if (!tenant.quotaResetDate || tenant.quotaResetDate < now) {
    const nextReset = new Date();
    nextReset.setFullYear(nextReset.getFullYear() + 1); // 1 Yıllık periyot
    
    await database.update(tenants)
      .set({
        smsSentThisMonth: 0,
        whatsappSentThisMonth: 0,
        quotaResetDate: nextReset,
        updatedAt: new Date(),
      })
      .where(eq(tenants.id, tenantId));
    
    currentSms = 0;
    currentWhatsapp = 0;
  }

  // 3. Aktif öğrenci sayısını bul
  const [studentCountResult] = await database
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.tenantId, tenantId), eq(users.role, 'STUDENT')));
  
  const studentCount = studentCountResult?.count || 0;

  // 4. Plan limitini hesapla
  // Standart pakette sadece SMS vardır ve yıllık limit öğrenci başı 30'dur. WhatsApp gönderilemez.
  // Premium/Pro pakette hem SMS hem WhatsApp kullanılabilir ve toplam yıllık limit öğrenci başı 200'dür (ortak havuz).
  if (tenant.planType === 'STANDARD' && type === 'WHATSAPP') {
    return {
      allowed: false,
      error: 'Standart pakette WhatsApp gönderimi bulunmamaktadır. Lütfen Pro paketine yükseltin.',
      usage: currentWhatsapp,
      limit: 0,
    };
  }

  const quotaPerStudent = tenant.communicationQuotaPerStudent ?? (tenant.planType === 'PREMIUM' ? 200 : 30);
  const limit = studentCount * quotaPerStudent;

  // Premium için ortak havuz (SMS + WhatsApp), Standart için sadece SMS kullanımı
  const currentUsage = tenant.planType === 'PREMIUM'
    ? (currentSms + currentWhatsapp)
    : currentSms;

  if (currentUsage + requestedCount > limit) {
    return {
      allowed: false,
      error: `Yıllık kota sınırı aşıldı. Bu yılki limitiniz ${limit} mesajdır (Öğrenci sayısı: ${studentCount} x Öğrenci Başı Yıllık Kota: ${quotaPerStudent}). Kalan: ${limit - currentUsage}.`,
      usage: currentUsage,
      limit,
    };
  }

  // 5. Kotayı artır (Atomic update with constraint check to prevent race conditions)
  const checkCondition = tenant.planType === 'PREMIUM'
    ? sql`${tenants.smsSentThisMonth} + ${tenants.whatsappSentThisMonth} + ${requestedCount} <= ${limit}`
    : sql`${tenants.smsSentThisMonth} + ${requestedCount} <= ${limit}`;

  const updateResult = await database.update(tenants)
    .set(type === 'SMS' ? {
      smsSentThisMonth: sql`${tenants.smsSentThisMonth} + ${requestedCount}`,
      updatedAt: new Date(),
    } : {
      whatsappSentThisMonth: sql`${tenants.whatsappSentThisMonth} + ${requestedCount}`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(tenants.id, tenantId),
      checkCondition
    ))
    .returning();

  if (updateResult.length === 0) {
    return {
      allowed: false,
      error: `Yıllık kota sınırı aşıldı veya kurum bulunamadı (Eşzamanlı işlem engellendi).`,
      usage: currentUsage,
      limit,
    };
  }

  return {
    allowed: true,
    usage: currentUsage + requestedCount,
    limit,
  };
}

export * from './schema';
export type { NeonHttpDatabase } from 'drizzle-orm/neon-http';

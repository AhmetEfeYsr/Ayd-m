import { NextResponse } from 'next/server';
import { firebaseAuth } from '@/lib/firebase-admin';
import { db, users, tenants } from '@yks-platform/database';
import { and, eq, isNull, sql } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idToken, firstName, lastName } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'ID Token gereklidir.' }, { status: 400 });
    }

    // 1. Firebase ID Token doğrula
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi bulunamadı.' }, { status: 400 });
    }

    const { getRealEmail } = await import('@/lib/auth-helpers');
    const realEmail = getRealEmail(email);

    // 2. Kullanıcı zaten var mı kontrol et
    const [existingUser] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);
    if (existingUser) {
      return NextResponse.json({ success: true, message: 'Kullanıcı zaten kayıtlı.', user: existingUser });
    }

    // E-posta adresinden tenantId'yi ayrıştır
    const emailParts = email.split('@');
    let cleanTenantId = 'global';
    if (emailParts.length === 2) {
      const subParts = emailParts[0].split('_');
      if (subParts.length >= 3) {
        cleanTenantId = subParts[0];
      }
    }

    let tenantId: string | null = null;
    if (cleanTenantId !== 'global') {
      const [tenant] = await db.select().from(tenants)
        .where(sql`replace(${tenants.id}::text, '-', '') = ${cleanTenantId}`)
        .limit(1);
      if (tenant) {
        tenantId = tenant.id;
      }
    }

    // Email ve tenantId ile çakışma kontrolü (daha önce admin eklemiş ama uid atanmamış olabilir)
    const tenantCondition = tenantId ? eq(users.tenantId, tenantId) : isNull(users.tenantId);
    const [existingByEmail] = await db.select()
      .from(users)
      .where(and(eq(users.email, realEmail), tenantCondition))
      .limit(1);

    if (existingByEmail) {
      const [updated] = await db.update(users)
        .set({ firebaseUid: uid })
        .where(eq(users.id, existingByEmail.id))
        .returning();
      return NextResponse.json({ success: true, message: 'Kullanıcı Firebase UID ile eşleştirildi.', user: updated });
    }

    // 3. Yeni Öğrenci oluştur
    const [newUser] = await db.insert(users).values({
      firebaseUid: uid,
      email: realEmail,
      firstName: firstName || null,
      lastName: lastName || null,
      role: 'STUDENT',
      isActive: true,
      tenantId: tenantId,
    }).returning();

    return NextResponse.json({ success: true, user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error('Kayıt hatası:', error);
    return NextResponse.json({ error: 'Kayıt işlemi başarısız: ' + error.message }, { status: 400 });
  }
}

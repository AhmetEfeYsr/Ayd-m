import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { firebaseAuth } from '@/lib/firebase-admin';
import { db, users, tenants } from '@yks-platform/database';
import { eq, and, isNull, sql } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

const SECRET = () => {
  return process.env.MASTER_SALT || 'fallback_secret_for_development';
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'ID Token gereklidir.' }, { status: 400 });
    }

    // 1. Firebase ID Token'ı doğrula
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, email } = decodedToken;

    if (!email) {
      return NextResponse.json({ error: 'E-posta adresi bulunamadı.' }, { status: 400 });
    }

    const { getRealEmail } = await import('@/lib/auth-helpers');
    const realEmail = getRealEmail(email);

    // 2. Kullanıcıyı veritabanında bul
    let [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, uid)).limit(1);

    // Eğer veritabanında henüz yoksa ama Firebase'de varsa (örneğin ilk kez giriş yapan admin veya self-signup)
    if (!dbUser) {
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

      // E-posta ve tenantId ile aramayı dene (belki admin panelinden email ile eklendi ama uid henüz eşleşmedi)
      const tenantCondition = tenantId ? eq(users.tenantId, tenantId) : isNull(users.tenantId);
      const [existingUserByEmail] = await db.select()
        .from(users)
        .where(and(eq(users.email, realEmail), tenantCondition))
        .limit(1);

      if (existingUserByEmail) {
        // Eşleştir
        const [updated] = await db.update(users)
          .set({ firebaseUid: uid })
          .where(eq(users.id, existingUserByEmail.id))
          .returning();
        dbUser = updated;
      } else {
        // Kullanıcı veritabanında kayıtlı değil
        return NextResponse.json({
          error: 'Bu e-posta adresi sisteme kayıtlı değil. Lütfen yöneticinizle iletişime geçin.',
          code: 'USER_NOT_REGISTERED'
        }, { status: 401 });
      }
    }

    if (!dbUser.isActive) {
      return NextResponse.json({ error: 'Hesabınız aktif değil.' }, { status: 403 });
    }

    // 3. Özel JWT Session Token oluştur
    const sessionToken = jwt.sign(
      {
        userId: dbUser.id,
        firebaseUid: uid,
        email: dbUser.email,
        role: dbUser.role,
        tenantId: dbUser.tenantId,
      },
      SECRET(),
      { expiresIn: '7d' }
    );

    // 4. Çerezi set et
    const cookieStore = await cookies();
    cookieStore.set('auth_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 gün
      path: '/',
    });

    return NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        tenantId: dbUser.tenantId,
        publicKey: dbUser.publicKey,
        encryptedPrivateKey: dbUser.encryptedPrivateKey,
      }
    });
  } catch (error: any) {
    console.error('Session oluşturma hatası:', error);
    return NextResponse.json({ error: 'Kimlik doğrulama başarısız: ' + error.message }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('auth_session');
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

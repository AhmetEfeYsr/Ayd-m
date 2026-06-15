import { NextResponse } from 'next/server';
import { db, users, tenants } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { generateDesktopToken } from '@/lib/desktop-token';
import { ADMIN_ROLES } from '@/lib/auth';
import { getFirebaseEmail } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, tenantId, role } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'E-posta ve şifre zorunludur.' },
        { status: 400 }
      );
    }

    // 1. Veritabanından bu e-postaya ait aktif yönetici hesaplarını çek
    const matchedUsers = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        role: users.role,
        tenantId: users.tenantId,
        tenantName: tenants.name,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.email, email));

    const adminUsers = matchedUsers.filter((u) => u.isActive && ADMIN_ROLES.includes(u.role as any));

    if (adminUsers.length === 0) {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı yetkili yönetici hesabı bulunamadı.' },
        { status: 404 }
      );
    }

    let targetUser = adminUsers[0];

    // Eğer birden fazla yönetici hesabı varsa ve seçim yapılmamışsa, seçim listesi döndür
    if (adminUsers.length > 1) {
      if (tenantId && role) {
        const selected = adminUsers.find((u) => u.tenantId === tenantId && u.role === role);
        if (selected) {
          targetUser = selected;
        } else {
          return NextResponse.json(
            { error: 'Belirtilen kurum veya rol için geçerli kullanıcı bulunamadı.' },
            { status: 400 }
          );
        }
      } else {
        return NextResponse.json({
          requiresSelection: true,
          accounts: adminUsers.map((u) => ({
            tenantId: u.tenantId,
            role: u.role,
            tenantName: u.tenantName || 'Sistem Yöneticisi',
          })),
        });
      }
    }

    // Önekli Firebase e-postasını hesapla
    const firebaseEmail = getFirebaseEmail(email, targetUser.tenantId, targetUser.role);

    // 2. Firebase Auth REST API ile önekli e-posta ve şifreyi doğrula
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Firebase API anahtarı yapılandırılmamış.' },
        { status: 500 }
      );
    }

    const signInUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
    const authRes = await fetch(signInUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: firebaseEmail, password, returnSecureToken: true }),
    });

    const authData = await authRes.json();

    if (!authRes.ok) {
      return NextResponse.json(
        { error: 'E-posta adresi veya şifre hatalı.' },
        { status: 401 }
      );
    }

    const firebaseUid = authData.localId;

    // 3. Desktop token oluştur
    const token = await generateDesktopToken(firebaseUid, targetUser.email);

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: targetUser.email,
        role: targetUser.role,
        tenantId: targetUser.tenantId,
      },
    });
  } catch (error: any) {
    console.error('Desktop login hatası:', error);
    return NextResponse.json(
      { error: 'Sunucu hatası. Lütfen daha sonra tekrar deneyin.' },
      { status: 500 }
    );
  }
}

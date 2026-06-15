import { NextResponse } from 'next/server';
import { db, users, tenants } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { getFirebaseEmail } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email')?.trim();

    if (!email) {
      return NextResponse.json({ error: 'E-posta parametresi gereklidir.' }, { status: 400 });
    }

    // E-posta ile eşleşen tüm kullanıcıları ve kurum adlarını çek
    const matchedUsers = await db
      .select({
        id: users.id,
        role: users.role,
        tenantId: users.tenantId,
        tenantName: tenants.name,
        isActive: users.isActive,
      })
      .from(users)
      .leftJoin(tenants, eq(users.tenantId, tenants.id))
      .where(eq(users.email, email));

    // Firebase Auth login için kullanılacak önekli e-postaları hesapla
    const accounts = matchedUsers
      .filter((u) => u.isActive)
      .map((u) => ({
        id: u.id,
        role: u.role,
        tenantId: u.tenantId,
        tenantName: u.tenantName || (u.role === 'SYSTEM_ADMIN' ? 'Sistem Yöneticisi' : 'Genel'),
        firebaseEmail: getFirebaseEmail(email, u.tenantId, u.role),
      }));

    return NextResponse.json({ accounts });
  } catch (error: any) {
    console.error('Email lookup error:', error);
    return NextResponse.json({ error: 'Sunucu hatası: ' + error.message }, { status: 500 });
  }
}

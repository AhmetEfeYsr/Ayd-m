import { cookies, headers } from 'next/headers';
import { db, users } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';

export type UserRole = 'STUDENT' | 'TEACHER' | 'COACH' | 'INSTITUTION_ADMIN' | 'PUBLISHER' | 'SYSTEM_ADMIN';
export const ADMIN_ROLES: UserRole[] = ['TEACHER', 'COACH', 'INSTITUTION_ADMIN', 'PUBLISHER', 'SYSTEM_ADMIN'];

export interface AppUser {
  id: string;
  clerkId: string; // Firebase UID maps to clerkId in code for backward compatibility
  email: string;
  phone: string | null;
  parentPhone: string | null;
  role: UserRole;
  tenantId: string | null;
  classId: string | null;
}

const SECRET = () => {
  return process.env.MASTER_SALT || 'fallback_secret_for_development';
};

/**
 * Custom JWT session veya desktop token ile kullanıcının firebaseUid'sini döner.
 */
export async function getAuthClerkId(): Promise<string | null> {
  // 1. Session çerezini kontrol et
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('auth_session')?.value;
    if (sessionCookie) {
      const decoded = jwt.verify(sessionCookie, SECRET()) as any;
      if (decoded && decoded.firebaseUid) {
        return decoded.firebaseUid;
      }
    }
  } catch (err) {
    // Session token geçersiz veya süresi dolmuş
  }

  // 2. Desktop/Mobile token fallback (middleware tarafından doğrulanmış)
  try {
    const h = await headers();
    const desktopClerkId = h.get('x-desktop-clerk-id');
    if (desktopClerkId) return desktopClerkId;
    const firebaseUid = h.get('x-firebase-uid');
    if (firebaseUid) return firebaseUid;
  } catch {}

  return null;
}

export async function getCurrentDbUser(): Promise<AppUser | null> {
  const firebaseUid = await getAuthClerkId();
  if (!firebaseUid) return null;
  
  const result = await db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
  if (!result[0]) return null;

  return {
    id: result[0].id,
    clerkId: result[0].firebaseUid, // Kod uyumluluğu için firebaseUid'yi clerkId ismiyle döndürüyoruz
    email: result[0].email,
    phone: result[0].phone,
    parentPhone: result[0].parentPhone,
    role: result[0].role as UserRole,
    tenantId: result[0].tenantId,
    classId: result[0].classId,
  };
}

export async function requireAuth(): Promise<AppUser> {
  const user = await getCurrentDbUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function requireAdmin(): Promise<AppUser> {
  const user = await requireAuth();
  if (!ADMIN_ROLES.includes(user.role)) throw new Error('Forbidden');
  return user;
}

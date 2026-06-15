import { SignJWT, jwtVerify } from 'jose';

const SECRET = () => {
  if (process.env.NODE_ENV === 'production' && !process.env.DESKTOP_API_SECRET) {
    throw new Error("Critical Configuration Error: DESKTOP_API_SECRET is missing in production environment.");
  }
  const secret = process.env.DESKTOP_API_SECRET || process.env.MASTER_SALT;
  return new TextEncoder().encode(secret || 'fallback_secret_for_development');
};

/**
 * Desktop uygulaması için JWT oluşturur.
 * Token 30 gün geçerlidir.
 */
export async function generateDesktopToken(clerkId: string, email: string): Promise<string> {
  const payload = {
    clerkId,
    email,
  };
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET());
}

/**
 * Desktop JWT token'ını doğrular ve geçerliyse clerkId döner.
 */
export async function verifyDesktopToken(token: string): Promise<{ clerkId: string; email: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET());
    return { clerkId: payload.clerkId as string, email: payload.email as string };
  } catch (error) {
    return null;
  }
}

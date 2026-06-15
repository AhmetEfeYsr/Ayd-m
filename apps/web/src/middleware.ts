import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import * as jose from "jose";
import { verifyDesktopToken } from "@/lib/desktop-token";

const SECRET = new TextEncoder().encode(process.env.MASTER_SALT || "fallback_secret_for_development");
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "yks-platform";

// Firebase ID token'larını doğrulamak için Google JWKS istemcisi
const firebaseJwks = jose.createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

async function verifyFirebaseToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jose.jwtVerify(token, firebaseJwks, {
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      audience: FIREBASE_PROJECT_ID,
    });
    return payload.sub || null; // Firebase UID
  } catch (err) {
    console.error("Firebase ID Token verification failed:", err);
    return null;
  }
}

const isPublicRoute = (pathname: string) => {
  return (
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/veli") ||
    pathname.startsWith("/api/webhook") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/auth/desktop") ||
    pathname.startsWith("/api/auth/session") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/auth/lookup") ||
    pathname.startsWith("/api/feedback")
  );
};

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Gelen istemci isteklerindeki x-desktop-* ve x-firebase-uid başlıklarını temizle
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-desktop-clerk-id");
  requestHeaders.delete("x-desktop-email");
  requestHeaders.delete("x-firebase-uid");

  // Authorization başlığını kontrol et (Mobil veya Desktop istemciler için)
  const authHeader = request.headers.get("authorization") || "";
  let authenticatedUid: string | null = null;

  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.replace("Bearer ", "");
    
    // Eğer /api/ rotası ise öncelikle desktop token'ı olarak doğrulamayı dene
    if (pathname.startsWith("/api/")) {
      const desktopUser = await verifyDesktopToken(token);
      if (desktopUser) {
        requestHeaders.set("x-desktop-clerk-id", desktopUser.clerkId);
        requestHeaders.set("x-desktop-email", desktopUser.email);
        requestHeaders.set("x-firebase-uid", desktopUser.clerkId);
        return NextResponse.next({
          request: { headers: requestHeaders },
        });
      }
    }

    // Mobil veya diğer API istekleri için Firebase ID Token olarak doğrula
    const firebaseUid = await verifyFirebaseToken(token);
    if (firebaseUid) {
      authenticatedUid = firebaseUid;
    }
  }

  // Kamu rotaları için yetkilendirmeyi atla
  if (isPublicRoute(pathname)) {
    if (authenticatedUid) {
      requestHeaders.set("x-firebase-uid", authenticatedUid);
    }
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Eğer Authorization başlığı ile başarıyla doğrulandıysa devam et
  if (authenticatedUid) {
    requestHeaders.set("x-firebase-uid", authenticatedUid);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Session çerezini kontrol et
  const sessionToken = request.cookies.get("auth_session")?.value;

  if (!sessionToken) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  try {
    // Session token'ı doğrula
    const { payload } = await jose.jwtVerify(sessionToken, SECRET);
    if (payload && typeof payload.firebaseUid === "string") {
      requestHeaders.set("x-firebase-uid", payload.firebaseUid);
    }
    
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  } catch (err) {
    console.error("Middleware session verification failed:", err);
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL("/sign-in", request.url));
    response.cookies.delete("auth_session");
    return response;
  }
}

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};

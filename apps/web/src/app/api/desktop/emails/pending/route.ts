import { NextResponse } from 'next/server';
import { db, users, notificationLogs } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { verifyDesktopToken } from '@/lib/desktop-token';
import { ADMIN_ROLES } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const desktopUser = await verifyDesktopToken(token);
    
    if (!desktopUser) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Kullanıcıyı veritabanında bul
    const [dbUser] = await db.select().from(users).where(eq(users.firebaseUid, desktopUser.clerkId)).limit(1);
    if (!dbUser || !ADMIN_ROLES.includes(dbUser.role as any)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!dbUser.tenantId) {
      return NextResponse.json({ error: 'User does not belong to any tenant' }, { status: 400 });
    }

    // Bu tenanta ait gönderilmeyi bekleyen e-postaları çek
    const pendingEmails = await db.select()
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.tenantId, dbUser.tenantId),
          eq(notificationLogs.type, 'EMAIL'),
          eq(notificationLogs.status, 'PENDING')
        )
      );

    const { downloadNotificationPayloadFromR2 } = await import('@yks-platform/cloud');

    // R2'den full payload'ları (özellikle HTML gövdesini) paralel olarak çek ve birleştir
    const emailsWithFullPayload = await Promise.all(
      pendingEmails.map(async (email) => {
        if (email.r2PayloadKey) {
          try {
            const fullPayload = await downloadNotificationPayloadFromR2(email.r2PayloadKey);
            return {
              ...email,
              payload: fullPayload,
            };
          } catch (err) {
            console.error(`Failed to download payload from R2 for log ${email.id}:`, err);
            return email;
          }
        }
        return email;
      })
    );

    return NextResponse.json({ emails: emailsWithFullPayload });
  } catch (error: any) {
    console.error('Pending emails API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

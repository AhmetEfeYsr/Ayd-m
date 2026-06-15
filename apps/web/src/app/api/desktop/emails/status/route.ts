import { NextResponse } from 'next/server';
import { db, users, notificationLogs } from '@yks-platform/database';
import { eq, and } from 'drizzle-orm';
import { verifyDesktopToken } from '@/lib/desktop-token';
import { ADMIN_ROLES } from '@/lib/auth';

export async function POST(req: Request) {
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

    const body = await req.json();
    const { id, status } = body;

    if (!id || !['SENT', 'FAILED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Durumu güncelle
    const [updatedLog] = await db.update(notificationLogs)
      .set({ status: status })
      .where(
        and(
          eq(notificationLogs.id, id),
          eq(notificationLogs.tenantId, dbUser.tenantId)
        )
      )
      .returning();

    if (!updatedLog) {
      return NextResponse.json({ error: 'Log not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: updatedLog });
  } catch (error: any) {
    console.error('Update email status API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

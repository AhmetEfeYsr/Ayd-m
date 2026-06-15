import { NextResponse } from 'next/server';
import { sendTelegramReport } from '@yks-platform/cloud';
import { getAuthClerkId, ADMIN_ROLES } from '@/lib/auth';
import { db, users } from '@yks-platform/database';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0] || !ADMIN_ROLES.includes(reqUser[0].role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  await sendTelegramReport(body);
  return NextResponse.json({ success: true });
}

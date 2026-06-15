import { NextResponse } from 'next/server';
import { db, users } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { getCurrentDbUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentDbUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      encryptedPrivateKey: dbUser.encryptedPrivateKey,
    });
  } catch (error: any) {
    console.error("Error fetching keys detail:", error);
    return NextResponse.json({ error: 'Failed to fetch keys detail: ' + error.message }, { status: 500 });
  }
}

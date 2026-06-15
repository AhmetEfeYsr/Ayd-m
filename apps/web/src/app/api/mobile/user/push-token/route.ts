import { NextResponse } from 'next/server';
import { db, users } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { firebaseAuth } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decodedToken = await firebaseAuth.verifyIdToken(token);
    const { uid } = decodedToken;

    const body = await req.json();
    const { pushToken } = body;

    if (!pushToken) {
      return NextResponse.json({ error: 'Push token is required' }, { status: 400 });
    }

    // Update user push token
    const [updatedUser] = await db.update(users)
      .set({ expoPushToken: pushToken })
      .where(eq(users.firebaseUid, uid))
      .returning();

    if (!updatedUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push token update error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

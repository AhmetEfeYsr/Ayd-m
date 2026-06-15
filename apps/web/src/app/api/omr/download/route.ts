import { NextResponse } from 'next/server';
import { db, users, omrResults } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { getPresignedOMRDownloadUrl } from '@yks-platform/cloud';
import { getAuthClerkId } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userId = await getAuthClerkId();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    if (!key) return NextResponse.json({ error: 'key parameter is required' }, { status: 400 });

    // Güvenlik: kullanıcının kendi verisini indirdiğinden emin ol
    const dbUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
    if (!dbUser[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const result = await db
      .select()
      .from(omrResults)
      .where(eq(omrResults.r2StorageKey, key))
      .limit(1);

    if (!result[0]) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 });
    }

    const isOwner = result[0].studentId === dbUser[0].id;
    let isAuthorizedStaff = false;

    const staffRoles = ['TEACHER', 'COACH', 'INSTITUTION_ADMIN', 'SYSTEM_ADMIN'];
    if (staffRoles.includes(dbUser[0].role)) {
      if (dbUser[0].role === 'SYSTEM_ADMIN') {
        isAuthorizedStaff = true;
      } else {
        const studentUser = await db.query.users.findFirst({
          where: eq(users.id, result[0].studentId!)
        });
        if (studentUser && studentUser.tenantId === dbUser[0].tenantId) {
          isAuthorizedStaff = true;
        }
      }
    }

    if (!isOwner && !isAuthorizedStaff) {
      return NextResponse.json({ error: 'Forbidden: not authorized to access this data' }, { status: 403 });
    }

    // Redirect to R2 directly: zero egress fees, zero serverless runtime proxy costs!
    const presignedUrl = await getPresignedOMRDownloadUrl(key, 900);
    return NextResponse.redirect(presignedUrl);
  } catch (error: any) {
    console.error('Error in download route:', error);
    return NextResponse.json({ error: 'Failed to download OMR: ' + error.message }, { status: 500 });
  }
}

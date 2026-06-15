import { NextResponse, after } from 'next/server';
import { db, users, omrResults } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { getCurrentDbUser } from '@/lib/auth';
import { 
  encryptOMRData, 
  decryptOMRDataLegacy,
  uploadEncryptedOMRToR2, 
  downloadEncryptedOMRFromR2 
} from '@yks-platform/cloud';

export async function POST(req: Request) {
  try {
    const user = await getCurrentDbUser();
    if (!user || user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { publicKey, encryptedPrivateKey } = await req.json();
    if (!publicKey || !encryptedPrivateKey) {
      return NextResponse.json({ error: 'publicKey and encryptedPrivateKey are required' }, { status: 400 });
    }

    // 1. Update user credentials in DB
    await db.update(users)
      .set({ 
        publicKey, 
        encryptedPrivateKey,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    // 2. Transparent Background Migration of legacy results
    after(async () => {
      try {
        const exams = await db.select().from(omrResults).where(eq(omrResults.studentId, user.id));
        for (const exam of exams) {
          try {
            if (!exam.examId) continue;
            const legacyBuffer = await downloadEncryptedOMRFromR2(exam.r2StorageKey);
            // Decrypt legacy OMR using Master Salt & Firebase UID (clerkId maps to firebaseUid in user)
            const decryptedPayload = await decryptOMRDataLegacy(user.clerkId, legacyBuffer);
            // Encrypt with the new RSA Public Key
            const newEncryptedBuffer = await encryptOMRData(publicKey, decryptedPayload);
            await uploadEncryptedOMRToR2(user.id, exam.examId, newEncryptedBuffer);
          } catch (migrationErr) {
            console.error(`Failed migration for exam ${exam.examId}:`, migrationErr);
          }
        }
      } catch (backgroundErr) {
        console.error("Transparent background migration process failed:", backgroundErr);
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error setting up keys:", error);
    return NextResponse.json({ error: 'Failed to setup keys: ' + error.message }, { status: 500 });
  }
}

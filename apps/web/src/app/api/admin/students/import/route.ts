import { NextResponse } from 'next/server';
import { db, users } from '@yks-platform/database';
import { requireAdmin } from '@/lib/auth';
import { firebaseAuth } from '@/lib/firebase-admin';
import { eq } from 'drizzle-orm';
import { getFirebaseEmail } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.tenantId) {
      return NextResponse.json({ error: "Kurum yetkisi bulunamadı." }, { status: 403 });
    }
    const body = await req.json();
    
    if (!body.students || !Array.isArray(body.students)) {
      return NextResponse.json({ error: 'Geçersiz veri formatı' }, { status: 400 });
    }

    const validRows = body.students.filter((s: any) => s.email || s['E-posta']);
    
    if (validRows.length === 0) {
      return NextResponse.json({ error: 'Aktarılacak geçerli e-postaya sahip öğrenci bulunamadı' }, { status: 400 });
    }

    // Check maximum 30000 student limit total in the system
    const { count, and, eq: drizzleEq } = await import('drizzle-orm');
    const totalStudentCountResult = await db
      .select({ val: count() })
      .from(users)
      .where(
        eq(users.role, 'STUDENT')
      );
    const currentTotalStudentCount = totalStudentCountResult[0]?.val ?? 0;

    const existingStudents = await db
      .select({ email: users.email })
      .from(users)
      .where(
        and(
          eq(users.tenantId, admin.tenantId),
          eq(users.role, 'STUDENT')
        )
      );
    const existingEmails = new Set(existingStudents.map(s => s.email.toLowerCase()));

    const newStudentsCount = validRows.filter((s: any) => {
      const email = s.email || s['E-posta'];
      return email && !existingEmails.has(email.toLowerCase());
    }).length;

    if (currentTotalStudentCount + newStudentsCount > 30000) {
      const remainingQuota = 30000 - currentTotalStudentCount;
      return NextResponse.json({ 
        error: `Demo limit aşımı: Sistem genelinde şu an ${currentTotalStudentCount} kayıtlı öğrenci var. Sistem geneli maksimum 30.000 öğrenci limitine ulaşıldı. Yüklemek istediğiniz yeni öğrenci sayısı (${newStudentsCount}) sınırı aşıyor. En fazla ${remainingQuota} yeni öğrenci ekleyebilirsiniz.` 
      }, { status: 400 });
    }

    const newStudents = [];
    
    for (const s of validRows) {
      const email = s.email || s['E-posta'];
      const firebaseEmail = getFirebaseEmail(email, admin.tenantId, 'STUDENT');
      
      // Attempt to create user in Firebase Auth
      let firebaseUid = null;
      try {
        const firebaseUser = await firebaseAuth.createUser({
          email: firebaseEmail,
          displayName: `${s.firstName || s['Ad'] || ''} ${s.lastName || s['Soyad'] || ''}`.trim() || undefined,
        });
        await firebaseAuth.setCustomUserClaims(firebaseUser.uid, { role: 'STUDENT' });
        firebaseUid = firebaseUser.uid;
      } catch (err: any) {
        if (err.code === 'auth/email-already-exists') {
          try {
            const existing = await firebaseAuth.getUserByEmail(firebaseEmail);
            firebaseUid = existing.uid;
          } catch {}
        }
      }
      
      if (firebaseUid) {
        newStudents.push({
          firebaseUid: firebaseUid,
          email: email,
          firstName: s.firstName || s['Ad'] || null,
          lastName: s.lastName || s['Soyad'] || null,
          identityNumber: s.identityNumber || s['TC'] || s['TC Kimlik'] || null,
          studentNumber: s.studentNumber || s['Öğrenci No'] || null,
          phone: s.phone || s['Telefon'] || null,
          parentPhone: s.parentPhone || s['Veli Telefon'] || null,
          role: 'STUDENT' as const,
          tenantId: admin.tenantId,
        });
      }
    }

    let importedCount = 0;
    if (newStudents.length > 0) {
      for (const student of newStudents) {
        try {
          await db.insert(users)
            .values(student)
            .onConflictDoUpdate({
              target: users.firebaseUid,
              set: {
                firstName: student.firstName,
                lastName: student.lastName,
                identityNumber: student.identityNumber,
                studentNumber: student.studentNumber,
                phone: student.phone,
                parentPhone: student.parentPhone,
              }
            });
          importedCount++;
        } catch (dbErr: any) {
          // Handle identityNumber unique constraint violation
          if (student.identityNumber) {
            console.warn(`TC Kimlik çakışması tespit edildi, kayıt atlandı: ${student.identityNumber}`);
          } else {
            console.error('Insert failed:', dbErr);
          }
        }
      }
    }

    return NextResponse.json({ success: true, count: importedCount }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

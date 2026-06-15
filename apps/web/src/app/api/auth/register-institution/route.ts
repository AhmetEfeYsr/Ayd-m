import { NextResponse } from 'next/server';
import { db, tenants, users } from '@yks-platform/database';
import { firebaseAuth } from '@/lib/firebase-admin';
import { getFirebaseEmail } from '@/lib/auth-helpers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      tenantName,
      firstName,
      lastName,
      email,
      password,
    } = body;

    // 1. Check maximum 30 tenants limit for demo
    const { count, eq } = await import('drizzle-orm');
    const tenantCountResult = await db
      .select({ val: count() })
      .from(tenants)
      .where(eq(tenants.type, 'INSTITUTION'));
    const tenantCount = tenantCountResult[0]?.val ?? 0;
    if (tenantCount >= 30) {
      return NextResponse.json({ error: 'Demo sürümü için maksimum 30 dershane sınırına ulaşılmıştır. Yeni kayıt alınamamaktadır.' }, { status: 400 });
    }

    // 1b. Check maximum 30,000 total students limit
    const studentCountResult = await db
      .select({ val: count() })
      .from(users)
      .where(eq(users.role, 'STUDENT'));
    const totalStudentCount = studentCountResult[0]?.val ?? 0;
    if (totalStudentCount >= 30000) {
      return NextResponse.json({ error: 'Demo sürümü için sistem geneli toplam 30.000 öğrenci sınırına ulaşılmıştır. Yeni kayıt alınamamaktadır.' }, { status: 400 });
    }

    // 2. Inputs validation
    if (!tenantName || !firstName || !lastName || !email || !password) {
      return NextResponse.json({ error: 'Tüm alanları doldurmak zorunludur.' }, { status: 400 });
    }

    // Determine plan type - demo users get PREMIUM features by default
    const planType = 'PREMIUM';

    // 3. Create the Tenant (Institution) in DB
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);

    const [newTenant] = await db.insert(tenants).values({
      name: tenantName,
      type: 'INSTITUTION',
      planType,
      communicationQuotaPerStudent: 1000,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: oneYearLater,
      iyzicoPaymentId: 'DEMO_FREE',
      smsSentThisMonth: 0,
      whatsappSentThisMonth: 0,
    }).returning();

    // 5. Generate Firebase Auth Email
    const firebaseEmail = getFirebaseEmail(email, newTenant.id, 'INSTITUTION_ADMIN');

    // 6. Create User in Firebase Auth
    let fbUser;
    try {
      fbUser = await firebaseAuth.createUser({
        email: firebaseEmail,
        password: password,
        displayName: `${firstName} ${lastName}`,
      });
    } catch (fbError: any) {
      console.error('Firebase user creation failed, rolling back tenant:', fbError);
      // Rollback tenant from db
      const { eq } = await import('drizzle-orm');
      await db.delete(tenants).where(eq(tenants.id, newTenant.id));

      if (fbError.code === 'auth/email-already-in-use') {
        return NextResponse.json({ error: 'Bu e-posta adresi zaten kullanımda.' }, { status: 400 });
      }
      return NextResponse.json({ error: `Firebase kaydı başarısız: ${fbError.message}` }, { status: 400 });
    }

    // 7. Save User in database linked to Tenant
    try {
      const [newUser] = await db.insert(users).values({
        firebaseUid: fbUser.uid,
        email: email, // Real email is saved here
        firstName,
        lastName,
        role: 'INSTITUTION_ADMIN',
        tenantId: newTenant.id,
        isActive: true,
      }).returning();

      return NextResponse.json({
        success: true,
        message: 'Kurum kaydı başarıyla tamamlandı.',
        firebaseEmail, // Send back so client can sign in
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          tenantId: newUser.tenantId,
        }
      }, { status: 201 });

    } catch (dbError: any) {
      console.error('Database user insertion failed, rolling back Firebase & Tenant:', dbError);
      
      // Clean up Firebase Auth user
      await firebaseAuth.deleteUser(fbUser.uid).catch(() => {});
      // Clean up Tenant
      const { eq } = await import('drizzle-orm');
      await db.delete(tenants).where(eq(tenants.id, newTenant.id));

      return NextResponse.json({ error: `Kullanıcı veri kaydı başarısız: ${dbError.message}` }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Institution registration route error:', error);
    return NextResponse.json({ error: `Sunucu hatası: ${error.message}` }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { count, eq } = await import('drizzle-orm');
    
    // Count tenants
    const tenantCountResult = await db
      .select({ val: count() })
      .from(tenants)
      .where(eq(tenants.type, 'INSTITUTION'));
    const tenantCount = tenantCountResult[0]?.val ?? 0;

    // Count total students
    const studentCountResult = await db
      .select({ val: count() })
      .from(users)
      .where(eq(users.role, 'STUDENT'));
    const studentCount = studentCountResult[0]?.val ?? 0;

    return NextResponse.json({
      tenantCount,
      studentCount,
      isInstitutionLimitReached: tenantCount >= 30,
      isStudentLimitReached: studentCount >= 30000,
      isLimitReached: tenantCount >= 30 || studentCount >= 30000,
    });
  } catch (error: any) {
    console.error('Registration status route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

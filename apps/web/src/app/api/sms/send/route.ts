import { NextResponse } from 'next/server';
import { db, users, tenants, smsTemplates } from '@yks-platform/database';
import { eq, and, sql } from 'drizzle-orm';
import { sendBulkSms } from '@yks-platform/cloud';
import { getAuthClerkId, ADMIN_ROLES } from '@/lib/auth';

export async function POST(req: Request) {
  const userId = await getAuthClerkId();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const reqUser = await db.select().from(users).where(eq(users.firebaseUid, userId)).limit(1);
  if (!reqUser[0] || !ADMIN_ROLES.includes(reqUser[0].role as any)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  let { templateContent, templateId, recipientIds } = body;

  // Masaüstünden templateId gelirse veritabanından şablonu çözümle
  if (templateId && !templateContent) {
    const template = await db.select().from(smsTemplates).where(eq(smsTemplates.id, templateId)).limit(1);
    if (template[0]) {
      templateContent = template[0].content;
    } else {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }
  }

  if (!templateContent) return NextResponse.json({ error: 'Template content required' }, { status: 400 });

  const tenant = reqUser[0].tenantId
    ? await db.select().from(tenants).where(eq(tenants.id, reqUser[0].tenantId)).limit(1)
    : [];

  let conditions = [eq(users.role, 'STUDENT')];
  if (reqUser[0].tenantId) conditions.push(eq(users.tenantId, reqUser[0].tenantId));

  const recipients = await db.select().from(users).where(and(...conditions));
  
  const filtered = recipientIds && recipientIds.length > 0
    ? recipients.filter((r) => recipientIds.includes(r.id))
    : recipients;

  const smsRecipients = filtered
    .filter((r) => r.parentPhone)
    .map((r) => ({
      phoneNumber: r.parentPhone!,
      variables: { student_name: `${r.firstName || ''} ${r.lastName || ''}`.trim() || 'Öğrenci' },
    }));

  if (smsRecipients.length === 0) {
    return NextResponse.json({ error: 'Geçerli telefon numarasına sahip alıcı bulunamadı.' }, { status: 400 });
  }

  // Kota kontrolü
  const { checkAndIncrementQuota } = await import('@yks-platform/database');
  const quotaCheck = await checkAndIncrementQuota(reqUser[0].tenantId, smsRecipients.length, 'SMS');
  if (!quotaCheck.allowed) {
    return NextResponse.json({ error: quotaCheck.error }, { status: 403 });
  }

  try {
    await sendBulkSms({
      tenantId: reqUser[0].tenantId || '',
      smsSenderId: tenant[0]?.smsSenderId || 'YKS_PLATFORM',
      templateContent,
      recipients: smsRecipients,
    });
    return NextResponse.json({ success: true, sent: smsRecipients.length });
  } catch (error: any) {
    if (reqUser[0].tenantId) {
      await db.update(tenants)
        .set({
          smsSentThisMonth: sql`${tenants.smsSentThisMonth} - ${smsRecipients.length}`,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, reqUser[0].tenantId));
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

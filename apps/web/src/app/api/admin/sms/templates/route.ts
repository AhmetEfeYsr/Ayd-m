import { NextResponse } from 'next/server';
import { db, smsTemplates } from '@yks-platform/database';
import { eq } from 'drizzle-orm';
import { requireAdmin } from '@/lib/auth';

export async function GET() {
  try {
    const admin = await requireAdmin();
    const data = admin.tenantId
      ? await db.select().from(smsTemplates).where(eq(smsTemplates.tenantId, admin.tenantId))
      : await db.select().from(smsTemplates);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

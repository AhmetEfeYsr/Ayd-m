import { NextResponse } from "next/server";
import { db, tenants } from "@yks-platform/database";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    const admin = await requireAdmin();
    if (!admin.tenantId) {
      return NextResponse.json({ error: "Tenant ID bulunamadı." }, { status: 400 });
    }
    const tenantData = await db.select().from(tenants).where(eq(tenants.id, admin.tenantId)).limit(1);
    if (!tenantData[0]) {
      return NextResponse.json({ error: "Dershane bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({
      smsSenderId: tenantData[0].smsSenderId || "",
      smsUsername: tenantData[0].smsUsername || "",
      smsPassword: tenantData[0].smsPassword || "",
      whatsappApiEndpoint: tenantData[0].whatsappApiEndpoint || "",
      whatsappApiToken: tenantData[0].whatsappApiToken || "",
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.tenantId) {
      return NextResponse.json({ error: "Tenant ID bulunamadı." }, { status: 400 });
    }
    const body = await req.json();
    const { smsSenderId, smsUsername, smsPassword, whatsappApiEndpoint, whatsappApiToken } = body;

    const [updatedTenant] = await db.update(tenants).set({
      smsSenderId: smsSenderId || null,
      smsUsername: smsUsername || null,
      smsPassword: smsPassword || null,
      whatsappApiEndpoint: whatsappApiEndpoint || null,
      whatsappApiToken: whatsappApiToken || null,
      updatedAt: new Date(),
    }).where(eq(tenants.id, admin.tenantId)).returning();

    return NextResponse.json({
      success: true,
      settings: {
        smsSenderId: updatedTenant.smsSenderId || "",
        smsUsername: updatedTenant.smsUsername || "",
        smsPassword: updatedTenant.smsPassword || "",
        whatsappApiEndpoint: updatedTenant.whatsappApiEndpoint || "",
        whatsappApiToken: updatedTenant.whatsappApiToken || "",
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

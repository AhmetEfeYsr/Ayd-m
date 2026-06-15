import { NextResponse } from "next/server";
import { db, subjects } from "@yks-platform/database";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const result = await db.select().from(subjects);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

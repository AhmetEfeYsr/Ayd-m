import { NextResponse } from "next/server";
import { db, userFeedback } from "@yks-platform/database";
import { getCurrentDbUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentDbUser();
    const body = await req.json();
    const { email, errorCode, module, part, description } = body;

    if (!module) return NextResponse.json({ error: "modül alanı zorunludur" }, { status: 400 });
    if (!part) return NextResponse.json({ error: "kısım/bölüm alanı zorunludur" }, { status: 400 });
    if (!description) return NextResponse.json({ error: "açıklama alanı zorunludur" }, { status: 400 });

    const [newFeedback] = await db.insert(userFeedback).values({
      userId: user?.id || null,
      email: email || user?.email || null,
      errorCode: errorCode || null,
      module,
      part,
      description,
      status: "OPEN",
    }).returning();

    return NextResponse.json(newFeedback);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

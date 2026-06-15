import { NextResponse } from "next/server";
import { db, users } from "@yks-platform/database";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { firebaseAuth } from "@/lib/firebase-admin";
import { getFirebaseEmail } from "@/lib/auth-helpers";

export async function GET() {
  try {
    const admin = await requireAdmin();
    const condition = admin.tenantId 
      ? and(eq(users.tenantId, admin.tenantId), eq(users.role, 'TEACHER'))
      : eq(users.role, 'TEACHER');
      
    const data = await db.select().from(users).where(condition);
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { email, firstName, lastName, phone } = body;

    let firebaseUid = body.firebaseUid;

    if (!firebaseUid && email) {
      const firebaseEmail = getFirebaseEmail(email, admin.tenantId, "TEACHER");
      try {
        const firebaseUser = await firebaseAuth.createUser({
          email: firebaseEmail,
          displayName: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
        });
        await firebaseAuth.setCustomUserClaims(firebaseUser.uid, { role: "TEACHER" });
        firebaseUid = firebaseUser.uid;
      } catch (err: any) {
        if (err.code === "auth/email-already-exists") {
          const existing = await firebaseAuth.getUserByEmail(firebaseEmail);
          firebaseUid = existing.uid;
        } else {
          return NextResponse.json({ error: "Firebase user creation failed: " + err.message }, { status: 400 });
        }
      }
    }

    if (!firebaseUid) {
      return NextResponse.json({ error: "firebaseUid or email is required" }, { status: 400 });
    }

    const [newTeacher] = await db.insert(users).values({
      firebaseUid: firebaseUid,
      email: email || "",
      firstName: firstName || null,
      lastName: lastName || null,
      phone: phone || null,
      role: 'TEACHER',
      tenantId: admin.tenantId,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email: email || "",
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        tenantId: admin.tenantId,
      }
    })
    .returning();

    return NextResponse.json(newTeacher);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, firstName, lastName, phone } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0] || existing[0].role !== 'TEACHER') {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updatedTeacher] = await db.update(users).set({
      firstName: firstName !== undefined ? firstName : existing[0].firstName,
      lastName: lastName !== undefined ? lastName : existing[0].lastName,
      phone: phone !== undefined ? (phone || null) : existing[0].phone,
    }).where(eq(users.id, id)).returning();

    try {
      await firebaseAuth.updateUser(existing[0].firebaseUid, {
        displayName: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
      });
    } catch (e) {
      console.error("Firebase user update failed:", e);
    }

    return NextResponse.json(updatedTeacher);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await requireAdmin();
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0] || existing[0].role !== 'TEACHER') {
      return NextResponse.json({ error: "Teacher not found" }, { status: 404 });
    }

    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await firebaseAuth.deleteUser(existing[0].firebaseUid);
    } catch (e) {
      console.error("Firebase user delete failed:", e);
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

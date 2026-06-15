import { NextResponse } from "next/server";
import { db, users } from "@yks-platform/database";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth";
import { firebaseAuth } from "@/lib/firebase-admin";
import { getFirebaseEmail } from "@/lib/auth-helpers";

export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();
    if (!admin.tenantId) {
      return NextResponse.json({ error: "Kurum yetkisi bulunamadı." }, { status: 403 });
    }
    const body = await req.json();
    const { email, firstName, lastName, classId, identityNumber, phone, parentPhone } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    let firebaseUid = null;
    const firebaseEmail = getFirebaseEmail(email, admin.tenantId, "STUDENT");

    try {
      const firebaseUser = await firebaseAuth.createUser({
        email: firebaseEmail,
        displayName: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
      });
      await firebaseAuth.setCustomUserClaims(firebaseUser.uid, { role: "STUDENT" });
      firebaseUid = firebaseUser.uid;
    } catch (err: any) {
      if (err.code === "auth/email-already-exists") {
        const existing = await firebaseAuth.getUserByEmail(firebaseEmail);
        firebaseUid = existing.uid;
      } else {
        return NextResponse.json({ error: "Firebase user creation failed: " + err.message }, { status: 400 });
      }
    }

    // Check if the student already exists
    const studentExists = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.tenantId, admin.tenantId)
        )
      )
      .limit(1);

    if (studentExists.length === 0) {
      const { count } = await import("drizzle-orm");
      const studentCountResult = await db
        .select({ val: count() })
        .from(users)
        .where(
          eq(users.role, "STUDENT")
        );
      const studentCount = studentCountResult[0]?.val ?? 0;
      if (studentCount >= 30000) {
        return NextResponse.json({ error: "Demo sürümü için sistem geneli toplam 30.000 öğrenci limitine ulaşıldı. Yeni öğrenci eklenemez." }, { status: 400 });
      }
    }

    const [newStudent] = await db.insert(users).values({
      firebaseUid: firebaseUid,
      email,
      firstName: firstName || null,
      lastName: lastName || null,
      classId: classId || null,
      identityNumber: identityNumber || null,
      phone: phone || null,
      parentPhone: parentPhone || null,
      role: "STUDENT",
      tenantId: admin.tenantId,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: {
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        classId: classId || null,
        identityNumber: identityNumber || null,
        phone: phone || null,
        parentPhone: parentPhone || null,
        tenantId: admin.tenantId,
      }
    })
    .returning();

    return NextResponse.json(newStudent, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const { id, firstName, lastName, classId, identityNumber, phone, parentPhone } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (!existing[0] || existing[0].role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (admin.tenantId && existing[0].tenantId !== admin.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [updatedStudent] = await db.update(users).set({
      firstName: firstName !== undefined ? firstName : existing[0].firstName,
      lastName: lastName !== undefined ? lastName : existing[0].lastName,
      classId: classId !== undefined ? (classId || null) : existing[0].classId,
      identityNumber: identityNumber !== undefined ? (identityNumber || null) : existing[0].identityNumber,
      phone: phone !== undefined ? (phone || null) : existing[0].phone,
      parentPhone: parentPhone !== undefined ? (parentPhone || null) : existing[0].parentPhone,
    }).where(eq(users.id, id)).returning();

    try {
      await firebaseAuth.updateUser(existing[0].firebaseUid, {
        displayName: `${firstName || ""} ${lastName || ""}`.trim() || undefined,
      });
    } catch (e) {
      console.error("Firebase user update failed:", e);
    }

    return NextResponse.json(updatedStudent);
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
    if (!existing[0] || existing[0].role !== "STUDENT") {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
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

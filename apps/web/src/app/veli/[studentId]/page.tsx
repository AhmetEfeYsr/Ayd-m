import { redirect } from "next/navigation";
import { db, omrResults, exams, users, examAssignments, classrooms } from "@yks-platform/database";
import { eq, desc } from "drizzle-orm";
import NetTrendChart from "@/components/NetTrendChart";
import crypto from "crypto";

export const metadata = { title: "Veli Bilgilendirme Portalı — YKS 2026" };

export default async function ParentPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ studentId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { studentId } = await params;
  const { token } = await searchParams;

  if (!token) redirect("/sign-in");

  // Validate Token
  const secret = process.env.MASTER_SALT || "fallback";
  
  let isValid = false;
  try {
    const decodedStr = Buffer.from(token, "base64url").toString("utf-8");
    const parts = decodedStr.split(".");
    if (parts.length === 2) {
      const [expStr, signature] = parts;
      const exp = parseInt(expStr, 10);
      
      if (!isNaN(exp) && Date.now() <= exp && signature) {
        const expectedSignature = crypto.createHmac("sha256", secret).update(`${studentId}:${exp}`).digest("hex");
        
        const sigBuf = Buffer.from(signature, "hex");
        const expectedSigBuf = Buffer.from(expectedSignature, "hex");
        
        if (sigBuf.length === expectedSigBuf.length && crypto.timingSafeEqual(sigBuf, expectedSigBuf)) {
          isValid = true;
        }
      }
    }
  } catch (err) {
    // Parsing error means invalid token
  }

  if (!isValid) {
    return (
      <div className="dashboard-wrapper">
        <div className="stat-card" style={{ color: "#ef4444", textAlign: "center" }}>
          Geçersiz veya süresi dolmuş veli erişim linki.
        </div>
      </div>
    );
  }

  const student = await db.select().from(users).where(eq(users.id, studentId)).limit(1);
  if (!student[0]) redirect("/sign-in");

  const results = await db
    .select({
      id: omrResults.id,
      netScore: omrResults.netScore,
      processedAt: omrResults.processedAt,
      examId: omrResults.examId,
      examName: exams.name,
      examType: exams.type,
      examDate: exams.date,
    })
    .from(omrResults)
    .leftJoin(exams, eq(omrResults.examId, exams.id))
    .where(eq(omrResults.studentId, studentId))
    .orderBy(desc(omrResults.processedAt))
    .limit(10);

  const seatingAssignments = await db
    .select({
      id: examAssignments.id,
      examName: exams.name,
      examDate: exams.date,
      classroomName: classrooms.name,
      seatNumber: examAssignments.seatNumber,
    })
    .from(examAssignments)
    .leftJoin(exams, eq(examAssignments.examId, exams.id))
    .leftJoin(classrooms, eq(examAssignments.classroomId, classrooms.id))
    .where(eq(examAssignments.studentId, studentId));

  const avgNet = results.length > 0 ? results.reduce((s, r) => s + (r.netScore ?? 0), 0) / results.length : 0;

  return (
    <div className="dashboard-wrapper">
      <header className="header-section">
        <div>
          <h1 className="header-title">Veli Portalı</h1>
          <p className="header-subtitle">
            Öğrenci: {student[0].firstName ? `${student[0].firstName} ${student[0].lastName || ''}` : student[0].email}
          </p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Toplam Deneme</span>
          <div className="stat-value">{results.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ortalama Net</span>
          <div className="stat-value text-green">{avgNet.toFixed(1)}</div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <NetTrendChart data={[...results].reverse().map((r) => ({ name: r.examName || "Sınav", score: r.netScore || 0 }))} />
      </section>

      {seatingAssignments.length > 0 && (
        <section style={{ marginBottom: "40px" }}>
          <h2 className="section-title">🦋 Sınav Giriş Yerleri (Oturma Planı)</h2>
          <div className="admin-table-wrapper stat-card" style={{ padding: 0, overflow: 'hidden' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Sınav</th>
                  <th>Tarih</th>
                  <th>Derslik</th>
                  <th>Sıra No</th>
                </tr>
              </thead>
              <tbody>
                {seatingAssignments.map((sa) => (
                  <tr key={sa.id}>
                    <td style={{ fontWeight: 500 }}>{sa.examName}</td>
                    <td>{sa.examDate ? new Date(sa.examDate).toLocaleDateString("tr-TR") : "—"}</td>
                    <td>{sa.classroomName || "—"}</td>
                    <td><strong>{sa.seatNumber}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="recent-exams-section">
        <h2 className="section-title">Son Sınav Sonuçları</h2>
        <div className="admin-table-wrapper stat-card" style={{ padding: 0 }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Sınav</th>
                <th>Tür</th>
                <th>Tarih</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 && (
                <tr><td colSpan={4}>Henüz sınav sonucu bulunmuyor.</td></tr>
              )}
              {results.map((r) => (
                <tr key={r.id}>
                  <td>{r.examName || "Sınav"}</td>
                  <td>{r.examType}</td>
                  <td>{r.examDate ? new Date(r.examDate).toLocaleDateString("tr-TR") : "—"}</td>
                  <td><strong>{(r.netScore ?? 0).toFixed(1)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

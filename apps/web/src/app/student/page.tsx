import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db, omrResults, exams, examAssignments, classrooms } from "@yks-platform/database";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import NetTrendChart from "@/components/NetTrendChart";
import crypto from "crypto";

export const metadata = { title: "Öğrenci Paneli — YKS 2026" };

export default async function StudentDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/sign-in");
  if (user.role !== "STUDENT") redirect("/admin");

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
    .where(eq(omrResults.studentId, user.id))
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
    .where(eq(examAssignments.studentId, user.id));

  const latestNet = results[0]?.netScore ?? 0;
  const prevNet = results[1]?.netScore ?? 0;
  const avgNet = results.length > 0
    ? results.reduce((s, r) => s + (r.netScore ?? 0), 0) / results.length
    : 0;
  const totalExams = results.length;

  const secret = process.env.MASTER_SALT || "fallback";
  // The token includes an expiration timestamp (e.g. valid for 30 days)
  const exp = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const signature = crypto.createHmac("sha256", secret).update(`${user.id}:${exp}`).digest("hex");
  const parentToken = Buffer.from(`${exp}.${signature}`).toString("base64url");
  const parentLink = `/veli/${user.id}?token=${parentToken}`;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yks.pairaaa.com";
  const parentFullLink = `${baseUrl.replace(/\/$/, "")}${parentLink}`;

  return (
    <div className="dashboard-wrapper">
      <header className="header-section">
        <div>
          <h1 className="header-title">Merhaba, {user.email.split("@")[0]}</h1>
          <p className="header-subtitle">Net analizlerin ve sınav durumun aşağıda.</p>
        </div>
      </header>

      {totalExams > 0 && latestNet > prevNet && (
        <div className="target-streak-banner">
          <span className="streak-icon">📈</span>
          <div className="streak-text">
            <strong>Net Artışı!</strong>
            <p>Son denemen öncekine göre <strong>{(latestNet - prevNet).toFixed(1)}</strong> net arttı.</p>
          </div>
        </div>
      )}

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Son Deneme Neti</span>
          <div className="stat-value text-green">{latestNet.toFixed(1)}</div>
          <div className="stat-meta">Önceki: {prevNet.toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ortalama Net</span>
          <div className="stat-value">{avgNet.toFixed(1)}</div>
          <div className="stat-meta">{totalExams} sınav</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Toplam Deneme</span>
          <div className="stat-value">{totalExams}</div>
        </div>
      </section>

      <section style={{ marginBottom: "40px" }}>
        <NetTrendChart data={[...results].reverse().map(r => ({ name: r.examName || "Sınav", score: r.netScore || 0 }))} />
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

      <section style={{ marginBottom: "20px" }}>
        <div className="stat-card" style={{ background: "rgba(59, 130, 246, 0.1)", borderColor: "rgba(59, 130, 246, 0.2)" }}>
          <h3 className="section-title" style={{ color: "#60a5fa", margin: 0, marginBottom: 8 }}>👨‍👩‍👧 Veli Erişim Linki</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Aşağıdaki linki velinle paylaşarak, senin sınav analizlerini ve gelişimini takip etmesini sağlayabilirsin.
          </p>
          <input 
            type="text" 
            readOnly 
            className="admin-input" 
            style={{ width: "100%", fontSize: 12, opacity: 0.8 }} 
            value={parentFullLink}
          />
        </div>
      </section>

      <section className="recent-exams-section">
        <h2 className="section-title">Son Denemeler</h2>
        <div className="exam-list">
          {results.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
              Henüz sınav sonucu bulunmuyor. Kurumunuz OMR verilerinizi yüklediğinde burada görünecek.
            </p>
          )}
          {results.map((r) => (
            <Link href={`/student/exams/${r.examId}`} key={r.id} className="exam-item" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="exam-info">
                <h4>{r.examName || "Sınav"}</h4>
                <span>{r.examDate ? new Date(r.examDate).toLocaleDateString("tr-TR") : ""}</span>
              </div>
              <div className="exam-score">{(r.netScore ?? 0).toFixed(1)} Net</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

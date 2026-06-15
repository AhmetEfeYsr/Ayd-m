import { redirect } from "next/navigation";
import { getCurrentDbUser } from "@/lib/auth";
import { db, omrResults, exams } from "@yks-platform/database";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Sınavlarım — YKS 2026" };

export default async function StudentExamsPage() {
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
    .limit(50);

  const avgNet = results.length > 0
    ? results.reduce((s, r) => s + (r.netScore ?? 0), 0) / results.length
    : 0;

  return (
    <div className="dashboard-wrapper">
      <header className="header-section">
        <div>
          <h1 className="header-title">Sınavlarım</h1>
          <p className="header-subtitle">Tüm deneme sınavları ve sonuçların</p>
        </div>
      </header>

      <section className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Toplam Sınav</span>
          <div className="stat-value">{results.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ortalama Net</span>
          <div className="stat-value text-green">{avgNet.toFixed(1)}</div>
        </div>
      </section>

      <section className="recent-exams-section">
        <h2 className="section-title">Tüm Sınavlar</h2>
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
                <span>{r.examType} • {r.examDate ? new Date(r.examDate).toLocaleDateString("tr-TR") : ""}</span>
              </div>
              <div className="exam-score">{(r.netScore ?? 0).toFixed(1)} Net</div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

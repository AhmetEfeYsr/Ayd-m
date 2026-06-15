import { getCurrentDbUser } from "@/lib/auth";
import { db, users, classes, exams, omrResults } from "@yks-platform/database";
import { eq, count, avg, desc, and } from "drizzle-orm";
import Link from "next/link";

export const metadata = { title: "Kurum Paneli — Aydım" };

export default async function AdminDashboard() {
  const user = await getCurrentDbUser();
  if (!user) return null;

  const studentConditions = user.tenantId
    ? and(eq(users.role, "STUDENT"), eq(users.tenantId, user.tenantId))
    : eq(users.role, "STUDENT");

  const [studentCount] = await db.select({ value: count() }).from(users).where(studentConditions);
  const [classCount] = await db.select({ value: count() }).from(classes).where(
    user.tenantId ? eq(classes.tenantId, user.tenantId) : undefined
  );
  const [examCount] = await db.select({ value: count() }).from(exams).where(
    user.tenantId ? eq(exams.publisherId, user.tenantId) : undefined
  );

  const recentExams = await db.select().from(exams)
    .where(user.tenantId ? eq(exams.publisherId, user.tenantId) : undefined)
    .orderBy(desc(exams.date))
    .limit(5);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Kurum Dashboard</h1>

      <div className="admin-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Toplam Öğrenci</span>
          <div className="stat-value">{studentCount?.value ?? 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sınıf Sayısı</span>
          <div className="stat-value">{classCount?.value ?? 0}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Kayıtlı Sınav</span>
          <div className="stat-value">{examCount?.value ?? 0}</div>
        </div>
      </div>

      <section style={{ marginTop: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Son Sınavlar</h2>
          <Link href="/admin/exams" className="admin-btn-primary" style={{ textDecoration: "none" }}>Tümünü Gör</Link>
        </div>
        <div className="exam-list">
          {recentExams.length === 0 && (
            <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>Henüz sınav kaydı yok.</p>
          )}
          {recentExams.map((exam) => (
            <Link href={`/admin/exams/${exam.id}`} key={exam.id} className="exam-item" style={{ textDecoration: "none", color: "inherit" }}>
              <div className="exam-info">
                <h4>{exam.name}</h4>
                <span>{exam.type} • {exam.date ? new Date(exam.date).toLocaleDateString("tr-TR") : ""}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

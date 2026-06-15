"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function StudentDetailPage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/students/${studentId}/results`)
      .then((r) => r.json())
      .then(setResults)
      .finally(() => setLoading(false));
  }, [studentId]);

  const avgNet = results.length > 0
    ? results.reduce((s, r) => s + (r.netScore ?? 0), 0) / results.length
    : 0;

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Öğrenci Karnesi</h1>

      <div className="admin-stats-grid">
        <div className="stat-card">
          <span className="stat-label">Ortalama Net</span>
          <div className="stat-value text-green">{avgNet.toFixed(1)}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Sınav Sayısı</span>
          <div className="stat-value">{results.length}</div>
        </div>
      </div>

      <div className="admin-table-wrapper" style={{ marginTop: 24 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Sınav</th><th>Tür</th><th>Net</th><th>Tarih</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {results.map((r) => (
              <tr key={r.id}>
                <td>{r.examName || "—"}</td>
                <td>{r.examType}</td>
                <td><strong>{(r.netScore ?? 0).toFixed(1)}</strong></td>
                <td>{r.examDate ? new Date(r.examDate).toLocaleDateString("tr-TR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

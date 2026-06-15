"use client";
import { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function ExamResultsPage() {
  const { examId } = useParams<{ examId: string }>();
  const [data, setData] = useState<{ results: any[]; stats: any } | null>(null);
  const [loading, setLoading] = useState(true);

  const [kelebekLoading, setKelebekLoading] = useState(false);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);

  // Adaptif filtreler
  const [resultFilters, setResultFilters] = useState<FilterCriteria>(EMPTY_FILTER);
  const [kelebekFilters, setKelebekFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  useEffect(() => {
    fetch(`/api/exams/${examId}/results`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));

    fetch(`/api/admin/exams/${examId}/assignments`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setAssignments(d); })
      .catch(() => {});

    fetch(`/api/admin/classrooms`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setClassrooms(d); })
      .catch(() => {});

    fetch(`/api/admin/classes`)
      .then((r) => r.json())
      .then((d) => { if (Array.isArray(d)) setClasses(d); })
      .catch(() => {});
  }, [examId]);

  // ---- Filtrelenmiş sonuçlar ----
  const filteredResults = useMemo(() => {
    if (!data?.results) return [];
    let results = [...data.results];

    if (resultFilters.minNet) {
      results = results.filter((r) => (r.netScore ?? 0) >= Number(resultFilters.minNet));
    }
    if (resultFilters.maxNet) {
      results = results.filter((r) => (r.netScore ?? 0) <= Number(resultFilters.maxNet));
    }
    if (resultFilters.customQuery) {
      const q = resultFilters.customQuery.toLowerCase();
      results = results.filter(
        (r) =>
          (r.studentEmail || "").toLowerCase().includes(q) ||
          (r.studentId || "").toLowerCase().includes(q)
      );
    }
    return results;
  }, [data, resultFilters]);

  // ---- Filtrelenmiş derslikler (kelebek) ----
  const filteredClassrooms = useMemo(() => {
    let rooms = [...classrooms];
    if (kelebekFilters.minCapacity) {
      rooms = rooms.filter((r) => r.capacity >= Number(kelebekFilters.minCapacity));
    }
    if (kelebekFilters.maxCapacity) {
      rooms = rooms.filter((r) => r.capacity <= Number(kelebekFilters.maxCapacity));
    }
    return rooms;
  }, [classrooms, kelebekFilters]);

  const handleKelebek = async () => {
    setKelebekLoading(true);
    try {
      const params = new URLSearchParams();
      if (kelebekFilters.minNet) params.set("minNet", kelebekFilters.minNet);
      if (kelebekFilters.maxNet) params.set("maxNet", kelebekFilters.maxNet);
      if (kelebekFilters.examType) params.set("examType", kelebekFilters.examType);
      if (kelebekFilters.classId) params.set("classId", kelebekFilters.classId);
      if (kelebekFilters.minCapacity) params.set("minCapacity", kelebekFilters.minCapacity);
      if (kelebekFilters.maxCapacity) params.set("maxCapacity", kelebekFilters.maxCapacity);

      const res = await fetch(
        `/api/admin/exams/${examId}/assign-kelebek?${params.toString()}`,
        { method: "POST" }
      );
      if (res.ok) {
        alert("Kelebek dağıtımı tamamlandı!");
        const d = await res.json();
        setAssignments(d);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Dağıtım hatası: ${err.error || "Bilinmeyen hata"}`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setKelebekLoading(false);
    }
  };

  // ---- Export helpers ----
  const handleExportResultsPDF = () => {
    exportPDF(
      "Sınav Sonuçları",
      [
        { header: "Öğrenci", key: "student" },
        { header: "Net", key: "net" },
        { header: "Tarih", key: "date" },
      ],
      filteredResults.map((r) => ({
        student: r.studentEmail || r.studentId,
        net: (r.netScore ?? 0).toFixed(1),
        date: r.processedAt ? new Date(r.processedAt).toLocaleDateString("tr-TR") : "-",
      })),
      `sinav-sonuclari-${examId.slice(0, 8)}`
    );
  };

  const handleExportResultsExcel = () => {
    exportExcel(
      "Sınav Sonuçları",
      [
        { header: "Öğrenci", key: "student", width: 30 },
        { header: "Net", key: "net", width: 10 },
        { header: "Tarih", key: "date", width: 15 },
      ],
      filteredResults.map((r) => ({
        student: r.studentEmail || r.studentId,
        net: (r.netScore ?? 0).toFixed(1),
        date: r.processedAt ? new Date(r.processedAt).toLocaleDateString("tr-TR") : "-",
      })),
      `sinav-sonuclari-${examId.slice(0, 8)}`
    );
  };

  const handleExportAssignmentsPDF = () => {
    exportPDF(
      "Kelebek Dağıtım - Oturma Planı",
      [
        { header: "Öğrenci", key: "studentName" },
        { header: "Öğrenci Email", key: "studentEmail" },
        { header: "Derslik", key: "classroomName" },
        { header: "Sıra No", key: "seatNumber" },
      ],
      assignments.map(a => ({
        ...a,
        studentName: `${a.studentName || ''} ${a.studentLastName || ''}`.trim() || a.studentId,
        classroomName: a.classroomName || a.classroomId
      })),
      `kelebek-dagitim-${examId.slice(0, 8)}`
    );
  };

  const handleExportAssignmentsExcel = () => {
    exportExcel(
      "Kelebek Dağıtım",
      [
        { header: "Öğrenci", key: "studentName", width: 30 },
        { header: "Öğrenci Email", key: "studentEmail", width: 30 },
        { header: "Derslik", key: "classroomName", width: 20 },
        { header: "Sıra No", key: "seatNumber", width: 10 },
      ],
      assignments.map(a => ({
        ...a,
        studentName: `${a.studentName || ''} ${a.studentLastName || ''}`.trim() || a.studentId,
        classroomName: a.classroomName || a.classroomId
      })),
      `kelebek-dagitim-${examId.slice(0, 8)}`
    );
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Sınav Sonuçları & Kelebek Dağıtım</h1>

      {data?.stats && (
        <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <span className="stat-label">Toplam Katılım</span>
            <div className="stat-value">{data.stats.total}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sınıf Ortalaması</span>
            <div className="stat-value text-green">{Number(data.stats.avgNet ?? 0).toFixed(1)}</div>
          </div>
          <div className="stat-card">
            <span className="stat-label">Filtrelenen</span>
            <div className="stat-value" style={{ color: "#818cf8" }}>{filteredResults.length}</div>
            <span className="stat-meta">öğrenci</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Uygun Derslik</span>
            <div className="stat-value" style={{ color: "#f59e0b" }}>{filteredClassrooms.length}</div>
            <span className="stat-meta">
              Toplam {filteredClassrooms.reduce((a, c) => a + c.capacity, 0)} kişi kapasiteli
            </span>
          </div>
        </div>
      )}

      {/* ── Sonuç Filtreleri ── */}
      <FilterPanel
        filters={resultFilters}
        onChange={setResultFilters}
        onApply={() => {}}
        onReset={() => setResultFilters(EMPTY_FILTER)}
        showNetRange
        showSearch
        extraActions={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="admin-btn-sm" onClick={handleExportResultsPDF} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
              📄 PDF
            </button>
            <button className="admin-btn-sm" onClick={handleExportResultsExcel} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
              📊 Excel
            </button>
          </div>
        }
      />

      {/* ── Sonuç Tablosu ── */}
      <div className="admin-table-wrapper" style={{ marginBottom: 32 }}>
        <table className="admin-table">
          <thead>
            <tr><th>Öğrenci</th><th>Net</th><th>Tarih</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={3}>Yükleniyor...</td></tr>}
            {!loading && filteredResults.length === 0 && <tr><td colSpan={3}>Kriterlere uyan sonuç bulunamadı.</td></tr>}
            {filteredResults.map((r) => (
              <tr key={r.id}>
                <td>{r.studentEmail || r.studentId}</td>
                <td><strong>{(r.netScore ?? 0).toFixed(1)}</strong></td>
                <td>{r.processedAt ? new Date(r.processedAt).toLocaleDateString("tr-TR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Kelebek Dağıtım ── */}
      <div className="stat-card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h2 className="section-title" style={{ margin: 0 }}>🦋 Kelebek Dağıtım (Adaptif)</h2>
            <p className="stat-meta" style={{ marginTop: 4 }}>
              Aşağıdaki filtreleri kullanarak dağıtıma hangi öğrencilerin ve dersliklerin dahil edileceğini belirleyin.
            </p>
          </div>
        </div>

        <FilterPanel
          filters={kelebekFilters}
          onChange={setKelebekFilters}
          onApply={handleKelebek}
          onReset={() => setKelebekFilters(EMPTY_FILTER)}
          showExamType
          showNetRange
          showCapacity
          showClassFilter
          classes={classes}
          extraActions={
            assignments.length > 0 ? (
              <div style={{ display: "flex", gap: 6 }}>
                <button className="admin-btn-sm" onClick={handleExportAssignmentsPDF} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
                  📄 Oturma Planı PDF
                </button>
                <button className="admin-btn-sm" onClick={handleExportAssignmentsExcel} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
                  📊 Oturma Planı Excel
                </button>
              </div>
            ) : undefined
          }
        />

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            className="admin-btn-primary"
            onClick={handleKelebek}
            disabled={kelebekLoading}
            style={{ background: "#8b5cf6" }}
          >
            {kelebekLoading ? "Dağıtılıyor..." : "🦋 Kelebek Dağıt"}
          </button>
        </div>

        {assignments.length > 0 && (
          <div className="admin-table-wrapper" style={{ marginTop: 16 }}>
            <table className="admin-table">
              <thead>
                <tr><th>Öğrenci</th><th>Öğrenci Email</th><th>Derslik</th><th>Sıra No</th></tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={i}>
                    <td style={{ fontSize: 13 }}>{`${a.studentName || ''} ${a.studentLastName || ''}`.trim() || a.studentId}</td>
                    <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{a.studentEmail || "—"}</td>
                    <td style={{ fontSize: 13 }}>{a.classroomName || a.classroomId}</td>
                    <td><strong>{a.seatNumber}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

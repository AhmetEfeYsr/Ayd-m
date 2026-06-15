"use client";
import { useState, useEffect, useMemo } from "react";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function AttendancePage() {
  const [records, setRecords] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Attendance Form State
  const [studentId, setStudentId] = useState("");
  const [type, setType] = useState("LESSON");
  const [status, setStatus] = useState("PRESENT");
  const [saving, setSaving] = useState(false);

  // Filters
  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  useEffect(() => {
    fetchRecords();
    fetch("/api/admin/classes").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setClasses(d); }).catch(() => {});
    fetch("/api/students").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setStudents(d); }).catch(() => {});
  }, []);

  const fetchRecords = () => {
    setLoading(true);
    fetch("/api/attendance").then((r) => r.json()).then(setRecords).finally(() => setLoading(false));
  };

  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, type, status })
      });
      if (res.ok) {
        alert("Yoklama kaydedildi! Veliye bildirim gönderildi.");
        setStudentId("");
        fetchRecords();
      } else {
        alert("Hata oluştu.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    PRESENT: "#10b981",
    ABSENT: "#ef4444",
    LATE: "#f59e0b",
    EXCUSED: "#6366f1",
  };

  const statusLabels: Record<string, string> = {
    PRESENT: "Katıldı",
    ABSENT: "Gelmedi",
    LATE: "Geç Geldi",
    EXCUSED: "Mazeretli",
  };

  // Student display mapping
  const studentMap = useMemo(() => {
    const map: Record<string, string> = {};
    students.forEach((s) => {
      map[s.id] = `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email;
    });
    return map;
  }, [students]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    let result = [...records];

    if (filters.attendanceStatus) {
      result = result.filter((r) => r.status === filters.attendanceStatus);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((r) => r.date && new Date(r.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59);
      result = result.filter((r) => r.date && new Date(r.date) <= to);
    }
    if (filters.customQuery) {
      const q = filters.customQuery.toLowerCase();
      result = result.filter((r) => {
        const name = studentMap[r.studentId] || "";
        return name.toLowerCase().includes(q) || (r.studentId || "").toLowerCase().includes(q);
      });
    }

    return result;
  }, [records, filters, studentMap]);

  const handleExportPDF = () => {
    exportPDF(
      "Yoklama Raporu",
      [
        { header: "Öğrenci", key: "studentName" },
        { header: "Tür", key: "type" },
        { header: "Durum", key: "status" },
        { header: "Tarih", key: "date" },
      ],
      filteredRecords.map((r) => ({
        studentName: studentMap[r.studentId] || r.studentId,
        type: r.type === "EXAM" ? "Sınav" : "Ders",
        status: statusLabels[r.status] || r.status,
        date: r.date ? new Date(r.date).toLocaleDateString("tr-TR") : "-",
      })),
      "yoklama-raporu"
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      "Yoklama Raporu",
      [
        { header: "Öğrenci", key: "studentName", width: 25 },
        { header: "Tür", key: "type", width: 10 },
        { header: "Durum", key: "status", width: 12 },
        { header: "Tarih", key: "date", width: 15 },
      ],
      filteredRecords.map((r) => ({
        studentName: studentMap[r.studentId] || r.studentId,
        type: r.type === "EXAM" ? "Sınav" : "Ders",
        status: statusLabels[r.status] || r.status,
        date: r.date ? new Date(r.date).toLocaleDateString("tr-TR") : "-",
      })),
      "yoklama-raporu"
    );
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Yoklama Kayıtları</h1>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Kayıt</span>
          <div className="stat-value">{records.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Gelmedi</span>
          <div className="stat-value" style={{ color: "#ef4444" }}>
            {records.filter((r) => r.status === "ABSENT").length}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Geç Kaldı</span>
          <div className="stat-value" style={{ color: "#f59e0b" }}>
            {records.filter((r) => r.status === "LATE").length}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtrelenen</span>
          <div className="stat-value" style={{ color: "#818cf8" }}>{filteredRecords.length}</div>
        </div>
      </div>

      {/* Quick Add Form */}
      <div className="stat-card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Hızlı Yoklama Girişi</h2>
        <form onSubmit={handleAddAttendance} className="admin-form-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <select
            className="admin-input"
            style={{ flex: 1, minWidth: "200px" }}
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            required
          >
            <option value="">Öğrenci Seçin</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {`${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email}
              </option>
            ))}
          </select>
          <select className="admin-input" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="LESSON">Ders</option>
            <option value="EXAM">Sınav</option>
          </select>
          <select className="admin-input" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="PRESENT">Katıldı</option>
            <option value="ABSENT">Gelmedi</option>
            <option value="LATE">Geç Geldi</option>
            <option value="EXCUSED">Mazeretli</option>
          </select>
          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </form>
        <p className="stat-meta" style={{ marginTop: 8 }}>
          💡 Öğrenci &quot;Gelmedi&quot; veya &quot;Geç Kaldı&quot; olarak işaretlendiğinde veli otomatik SMS ile bilgilendirilir.
        </p>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => setFilters(EMPTY_FILTER)}
        showAttendance
        showDateRange
        showSearch
        extraActions={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="admin-btn-sm" onClick={handleExportPDF} style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}>
              📄 PDF
            </button>
            <button className="admin-btn-sm" onClick={handleExportExcel} style={{ background: "rgba(16, 185, 129, 0.15)", color: "#6ee7b7" }}>
              📊 Excel
            </button>
          </div>
        }
      />

      {/* Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Öğrenci</th><th>Tür</th><th>Durum</th><th>Tarih</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {!loading && filteredRecords.length === 0 && <tr><td colSpan={4}>Kriterlere uyan kayıt yok.</td></tr>}
            {filteredRecords.map((r) => (
              <tr key={r.id}>
                <td><strong>{studentMap[r.studentId] || r.studentId}</strong></td>
                <td>{r.type === "EXAM" ? "Sınav" : "Ders"}</td>
                <td>
                  <span style={{ color: statusColors[r.status] || "#fff", fontWeight: 600 }}>
                    {statusLabels[r.status] || r.status}
                  </span>
                </td>
                <td>{r.date ? new Date(r.date).toLocaleDateString("tr-TR") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

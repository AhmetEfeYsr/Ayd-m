"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function ExamsPage() {
  const [examList, setExamList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", type: "TYT", answerKeyString: "" });

  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  // Edit/Delete State
  const [editingExam, setEditingExam] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", type: "TYT", answerKeyString: "", isPublic: false });

  useEffect(() => {
    fetch("/api/exams").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setExamList(d); }).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const created = await res.json();
    setExamList((prev) => [created, ...prev]);
    setForm({ name: "", type: "TYT", answerKeyString: "" });
  };

  const handleUpdate = async () => {
    if (!editForm.name.trim() || !editForm.id) return;
    const res = await fetch(`/api/exams/${editForm.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      const updated = await res.json();
      setExamList((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      setEditingExam(null);
    } else {
      alert("Güncelleme başarısız.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sınavı silmek istediğinize emin misiniz? Sınava ait tüm optik sonuçlar ve Kelebek planları silinecektir!")) return;
    const res = await fetch(`/api/exams/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setExamList((prev) => prev.filter((e) => e.id !== id));
    } else {
      alert("Silme işlemi başarısız.");
    }
  };

  const filteredExams = useMemo(() => {
    let result = [...examList];
    if (filters.examType) {
      result = result.filter((e) => e.type === filters.examType);
    }
    if (filters.dateFrom) {
      const from = new Date(filters.dateFrom);
      result = result.filter((e) => e.date && new Date(e.date) >= from);
    }
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59);
      result = result.filter((e) => e.date && new Date(e.date) <= to);
    }
    if (filters.customQuery) {
      const q = filters.customQuery.toLowerCase();
      result = result.filter(
        (e) =>
          (e.name || "").toLowerCase().includes(q) ||
          (e.id || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [examList, filters]);

  const handleExportPDF = () => {
    exportPDF(
      "Sınav Listesi",
      [
        { header: "Sınav Adı", key: "name" },
        { header: "Tür", key: "type" },
        { header: "Tarih", key: "date" },
      ],
      filteredExams.map((e) => ({
        name: e.name,
        type: e.type,
        date: e.date ? new Date(e.date).toLocaleDateString("tr-TR") : "-",
      })),
      "sinav-listesi"
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      "Sınav Listesi",
      [
        { header: "Sınav Adı", key: "name", width: 30 },
        { header: "Tür", key: "type", width: 12 },
        { header: "Tarih", key: "date", width: 15 },
        { header: "ID", key: "id", width: 40 },
      ],
      filteredExams.map((e) => ({
        name: e.name,
        type: e.type,
        date: e.date ? new Date(e.date).toLocaleDateString("tr-TR") : "-",
        id: e.id,
      })),
      "sinav-listesi"
    );
  };

  const examTypeCounts = useMemo(() => ({
    TYT: examList.filter((e) => e.type === "TYT").length,
    AYT_SAY: examList.filter((e) => e.type === "AYT_SAY").length,
    AYT_EA: examList.filter((e) => e.type === "AYT_EA").length,
    AYT_SOZ: examList.filter((e) => e.type === "AYT_SOZ").length,
  }), [examList]);

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Sınav Yönetimi</h1>

      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Sınav</span>
          <div className="stat-value">{examList.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">TYT</span>
          <div className="stat-value" style={{ color: "#3b82f6" }}>{examTypeCounts.TYT}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">AYT Sayısal</span>
          <div className="stat-value" style={{ color: "#10b981" }}>{examTypeCounts.AYT_SAY}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtrelenen</span>
          <div className="stat-value" style={{ color: "#818cf8" }}>{filteredExams.length}</div>
        </div>
      </div>

      <div className="stat-card" style={{ marginBottom: 24 }}>
        <h3 style={{ marginBottom: 16, fontSize: 15 }}>Yeni Sınav Oluştur</h3>
        <div className="admin-form-row">
          <input className="admin-input" placeholder="Sınav adı" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="admin-input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="TYT">TYT</option>
            <option value="AYT_SAY">AYT SAY</option>
            <option value="AYT_EA">AYT EA</option>
            <option value="AYT_SOZ">AYT SÖZ</option>
          </select>
          <button className="admin-btn-primary" onClick={handleCreate}>Oluştur</button>
        </div>
        <input className="admin-input" style={{ marginTop: 8, width: "100%" }} placeholder="Cevap anahtarı (Opsiyonel: ABCDE_AB...)" value={form.answerKeyString} onChange={(e) => setForm({ ...form, answerKeyString: e.target.value })} />
      </div>

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => setFilters(EMPTY_FILTER)}
        showExamType
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

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Sınav Adı</th><th>Tür</th><th>Tarih</th><th style={{ width: "220px" }}>İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {!loading && filteredExams.length === 0 && <tr><td colSpan={4}>Kriterlere uyan sınav bulunamadı.</td></tr>}
            {filteredExams.map((e) => (
              <tr key={e.id}>
                <td><strong>{e.name}</strong></td>
                <td>
                  <span className="topic-badge" style={{
                    background: e.type === "TYT" ? "rgba(59, 130, 246, 0.15)" : "rgba(16, 185, 129, 0.15)",
                    color: e.type === "TYT" ? "#60a5fa" : "#34d399"
                  }}>
                    {e.type}
                  </span>
                </td>
                <td>{e.date ? new Date(e.date).toLocaleDateString("tr-TR") : "—"}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Link href={`/admin/exams/${e.id}`} className="admin-btn-sm">Sonuçlar</Link>
                    <button className="admin-btn-sm" onClick={() => {
                      setEditingExam(e);
                      setEditForm({
                        id: e.id,
                        name: e.name,
                        type: e.type,
                        answerKeyString: e.answerKeyString || "",
                        isPublic: e.isPublic || false
                      });
                    }}>Düzenle</button>
                    <button className="admin-btn-sm" style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }} onClick={() => handleDelete(e.id)}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingExam && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Sınavı Düzenle</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Sınav Adı</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Tür</label>
                <select
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                >
                  <option value="TYT">TYT</option>
                  <option value="AYT_SAY">AYT SAY</option>
                  <option value="AYT_EA">AYT EA</option>
                  <option value="AYT_SOZ">AYT SÖZ</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Cevap Anahtarı</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editForm.answerKeyString}
                  onChange={(e) => setEditForm({ ...editForm, answerKeyString: e.target.value })}
                  placeholder="ABCDE..."
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="edit-isPublic"
                  checked={editForm.isPublic}
                  onChange={(e) => setEditForm({ ...editForm, isPublic: e.target.checked })}
                />
                <label htmlFor="edit-isPublic" style={{ fontSize: 13, userSelect: "none", cursor: "pointer" }}>Herkese Açık Sınav</label>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setEditingExam(null)}>İptal</button>
              <button className="admin-btn-primary" onClick={handleUpdate}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

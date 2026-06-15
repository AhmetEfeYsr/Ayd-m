"use client";
import { useState, useEffect, useMemo } from "react";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");

  // Edit State
  const [editingClassroom, setEditingClassroom] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editCapacity, setEditCapacity] = useState("");

  // Filters
  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  useEffect(() => {
    fetchClassrooms();
  }, []);

  const fetchClassrooms = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/classrooms");
      const data = await res.json();
      if (Array.isArray(data)) setClassrooms(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !capacity) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, capacity: parseInt(capacity, 10) })
      });
      if (res.ok) {
        setName("");
        setCapacity("");
        fetchClassrooms();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (classroom: any) => {
    setEditingClassroom(classroom);
    setEditName(classroom.name);
    setEditCapacity(classroom.capacity.toString());
  };

  const handleUpdateClassroom = async () => {
    if (!editName || !editCapacity) return;
    try {
      const res = await fetch("/api/admin/classrooms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingClassroom.id, name: editName, capacity: parseInt(editCapacity, 10) })
      });
      if (res.ok) {
        setEditingClassroom(null);
        fetchClassrooms();
      } else {
        alert("Güncelleme başarısız.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteClassroom = async (id: string) => {
    if (!confirm("Bu dersliği silmek istediğinize emin misiniz?")) return;
    try {
      const res = await fetch(`/api/admin/classrooms?id=${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        fetchClassrooms();
      } else {
        alert("Silme işlemi başarısız.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filtered classrooms
  const filteredClassrooms = useMemo(() => {
    let result = [...classrooms];

    if (filters.minCapacity) {
      result = result.filter((c) => c.capacity >= Number(filters.minCapacity));
    }
    if (filters.maxCapacity) {
      result = result.filter((c) => c.capacity <= Number(filters.maxCapacity));
    }
    if (filters.customQuery) {
      const q = filters.customQuery.toLowerCase();
      result = result.filter((c) => (c.name || "").toLowerCase().includes(q));
    }

    return result;
  }, [classrooms, filters]);

  const totalCapacity = filteredClassrooms.reduce((a, c) => a + c.capacity, 0);

  const handleExportPDF = () => {
    exportPDF(
      "Derslik Listesi",
      [
        { header: "Derslik Adı", key: "name" },
        { header: "Kişi Kapasitesi", key: "capacity" },
        { header: "ID", key: "id" },
      ],
      filteredClassrooms,
      "derslik-listesi"
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      "Derslik Listesi",
      [
        { header: "Derslik Adı", key: "name", width: 25 },
        { header: "Kişi Kapasitesi", key: "capacity", width: 15 },
        { header: "ID", key: "id", width: 40 },
      ],
      filteredClassrooms,
      "derslik-listesi"
    );
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Derslikler ve Kapasiteler</h1>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Derslik</span>
          <div className="stat-value">{classrooms.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtrelenen</span>
          <div className="stat-value" style={{ color: "#818cf8" }}>{filteredClassrooms.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Toplam Kapasite</span>
          <div className="stat-value text-green">{totalCapacity}</div>
          <span className="stat-meta">kişi</span>
        </div>
      </div>

      {/* Add Form */}
      <div className="stat-card" style={{ marginBottom: 20 }}>
        <h2 className="section-title">Yeni Derslik Ekle</h2>
        <form onSubmit={handleAddClassroom} className="admin-form-row">
          <input
            type="text"
            className="admin-input"
            placeholder="Derslik Adı (Örn: 101, Fizik Lab)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={saving}
            required
          />
          <input
            type="number"
            className="admin-input"
            placeholder="Kişi Sayısı (Kapasite)"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            disabled={saving}
            required
          />
          <button type="submit" className="admin-btn-primary" disabled={saving}>
            {saving ? "Ekleniyor..." : "Ekle"}
          </button>
        </form>
      </div>

      {/* Filters */}
      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => setFilters(EMPTY_FILTER)}
        showCapacity
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
            <tr><th>Derslik Adı</th><th>Kişi Kapasitesi</th><th>ID</th><th style={{ width: "150px" }}>İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {!loading && filteredClassrooms.length === 0 && <tr><td colSpan={4}>Kriterlere uyan derslik bulunamadı.</td></tr>}
            {filteredClassrooms.map((c) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 500 }}>{c.name}</td>
                <td>
                  <span className="topic-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
                    {c.capacity} Kişi
                  </span>
                </td>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)" }}>{c.id}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn-sm" onClick={() => startEdit(c)}>Düzenle</button>
                    <button className="admin-btn-sm" style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }} onClick={() => handleDeleteClassroom(c.id)}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingClassroom && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "400px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Dersliği Düzenle</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Derslik Adı</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Kişi Kapasitesi</label>
                <input
                  type="number"
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setEditingClassroom(null)}>İptal</button>
              <button className="admin-btn-primary" onClick={handleUpdateClassroom}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

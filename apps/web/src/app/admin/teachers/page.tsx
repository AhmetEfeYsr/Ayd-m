"use client";
import { useState, useEffect, useMemo } from "react";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [editForm, setEditForm] = useState({ id: "", firstName: "", lastName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  useEffect(() => {
    fetchTeachers();
  }, []);

  const fetchTeachers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teachers");
      const data = await res.json();
      if (Array.isArray(data)) setTeachers(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        alert("Öğretmen başarıyla eklendi/güncellendi.");
        setShowCreate(false);
        setForm({ email: "", firstName: "", lastName: "", phone: "" });
        fetchTeachers();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      alert("Bir hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      const res = await fetch("/api/admin/teachers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        alert("Öğretmen başarıyla güncellendi.");
        setShowEdit(false);
        fetchTeachers();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      alert("Bir hata oluştu.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu öğretmeni silmek istediğinize emin misiniz? Giriş ve erişim yetkisi de dahil olmak üzere kalıcı olarak silinecektir.")) return;
    try {
      const res = await fetch(`/api/admin/teachers?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Öğretmen başarıyla silindi.");
        fetchTeachers();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      alert("Bir hata oluştu.");
    }
  };

  const filteredTeachers = useMemo(() => {
    let result = [...teachers];
    if (filters.customQuery) {
      const q = filters.customQuery.toLowerCase();
      result = result.filter(
        (t) =>
          (t.email || "").toLowerCase().includes(q) ||
          (`${t.firstName || ''} ${t.lastName || ''}`).toLowerCase().includes(q) ||
          (t.phone || "").toLowerCase().includes(q) ||
          (t.id || "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [teachers, filters]);

  const handleExportPDF = () => {
    exportPDF(
      "Öğretmen Listesi",
      [
        { header: "Ad Soyad", key: "fullName" },
        { header: "E-posta", key: "email" },
        { header: "Telefon", key: "phone" },
        { header: "ID", key: "id" },
      ],
      filteredTeachers.map((t) => ({
        fullName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || "-",
        email: t.email,
        phone: t.phone || "Belirtilmedi",
        id: t.id
      })),
      "ogretmen-listesi"
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      "Öğretmen Listesi",
      [
        { header: "Ad Soyad", key: "fullName", width: 25 },
        { header: "E-posta", key: "email", width: 30 },
        { header: "Telefon", key: "phone", width: 15 },
        { header: "ID", key: "id", width: 40 },
      ],
      filteredTeachers.map((t) => ({
        fullName: `${t.firstName || ''} ${t.lastName || ''}`.trim() || "-",
        email: t.email,
        phone: t.phone || "Belirtilmedi",
        id: t.id
      })),
      "ogretmen-listesi"
    );
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Öğretmen Listesi</h1>

      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Öğretmen</span>
          <div className="stat-value">{teachers.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtrelenen</span>
          <div className="stat-value" style={{ color: "#818cf8" }}>{filteredTeachers.length}</div>
        </div>
      </div>

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => setFilters(EMPTY_FILTER)}
        showSearch
        extraActions={
          <div style={{ display: "flex", gap: 6 }}>
            <button className="admin-btn-sm" onClick={() => setShowCreate(true)} style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>
              ➕ Öğretmen Ekle
            </button>
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
            <tr><th>Ad Soyad</th><th>E-posta</th><th>Telefon</th><th>İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {!loading && filteredTeachers.length === 0 && <tr><td colSpan={4}>Kriterlere uyan öğretmen bulunamadı.</td></tr>}
            {filteredTeachers.map((t) => (
              <tr key={t.id}>
                <td style={{ fontWeight: 600 }}>{`${t.firstName || ''} ${t.lastName || ''}`.trim() || "—"}</td>
                <td>{t.email}</td>
                <td>{t.phone || "Belirtilmedi"}</td>
                <td style={{ display: "flex", gap: "6px" }}>
                  <button
                    className="admin-btn-sm"
                    onClick={() => {
                      setEditForm({
                        id: t.id,
                        firstName: t.firstName || "",
                        lastName: t.lastName || "",
                        phone: t.phone || "",
                      });
                      setShowEdit(true);
                    }}
                    style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fcd34d" }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="admin-btn-sm"
                    onClick={() => handleDelete(t.id)}
                    style={{ background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5" }}
                  >
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Yeni Öğretmen Davet Et</h3>
            
            <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>E-posta *</label>
                <input
                  type="email"
                  required
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="ogretmen@kurum.com"
                />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Ad</label>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Soyad</label>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Telefon</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="05XXXXXXXXX"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setShowCreate(false)}>İptal</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Davet Et"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "450px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Öğretmen Bilgilerini Düzenle</h3>
            
            <form onSubmit={handleEdit} style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Ad</label>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Soyad</label>
                  <input
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Telefon</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  placeholder="05XXXXXXXXX"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                <button type="button" className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setShowEdit(false)}>İptal</button>
                <button type="submit" className="admin-btn-primary" disabled={updating}>
                  {updating ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

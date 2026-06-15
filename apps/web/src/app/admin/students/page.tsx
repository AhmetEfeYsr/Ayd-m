"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import FilterPanel, { FilterCriteria, EMPTY_FILTER } from "@/components/FilterPanel";
import { exportPDF, exportExcel } from "@/lib/exportUtils";
import * as XLSX from 'xlsx';

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterCriteria>(EMPTY_FILTER);

  // CRUD states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [addForm, setAddForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    classId: "",
    identityNumber: "",
    phone: "",
    parentPhone: "",
  });

  const [editForm, setEditForm] = useState({
    id: "",
    firstName: "",
    lastName: "",
    classId: "",
    identityNumber: "",
    phone: "",
    parentPhone: "",
  });

  useEffect(() => {
    fetchStudents();
    fetch("/api/admin/classes").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setClasses(d); }).catch(() => {});
  }, []);

  const fetchStudents = () => {
    setLoading(true);
    fetch("/api/students").then((r) => r.json()).then((d) => { if (Array.isArray(d)) setStudents(d); }).finally(() => setLoading(false));
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email) return alert("E-posta alanı zorunludur.");
    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      if (res.ok) {
        alert("Öğrenci başarıyla eklendi.");
        setShowAddModal(false);
        setAddForm({
          email: "",
          firstName: "",
          lastName: "",
          classId: "",
          identityNumber: "",
          phone: "",
          parentPhone: "",
        });
        fetchStudents();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Hata oluştu.");
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        alert("Öğrenci başarıyla güncellendi.");
        setShowEditModal(false);
        fetchStudents();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Hata oluştu.");
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Bu öğrenciyi silmek istediğinize emin misiniz? Giriş ve erişim yetkisi de dahil olmak üzere kalıcı olarak silinecektir.")) return;
    try {
      const res = await fetch(`/api/admin/students?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        alert("Öğrenci silindi.");
        fetchStudents();
      } else {
        const err = await res.json();
        alert("Hata: " + err.error);
      }
    } catch (err) {
      console.error(err);
      alert("Hata oluştu.");
    }
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'array' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws);
      
      try {
        const res = await fetch("/api/admin/students/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ students: data }),
        });
        if (res.ok) {
          alert("Öğrenciler başarıyla içe aktarıldı.");
          fetchStudents();
        } else {
          const err = await res.json();
          alert("İçe aktarma başarısız: " + err.error);
        }
      } catch (err) {
        console.error(err);
        alert("İçe aktarma hatası.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const filteredStudents = useMemo(() => {
    let result = [...students];

    if (filters.classId) {
      result = result.filter((s) => s.classId === filters.classId);
    }
    if (filters.customQuery) {
      const q = filters.customQuery.toLowerCase();
      result = result.filter(
        (s) =>
          (s.email || "").toLowerCase().includes(q) ||
          (s.firstName || "").toLowerCase().includes(q) ||
          (s.lastName || "").toLowerCase().includes(q) ||
          (s.identityNumber || "").toLowerCase().includes(q) ||
          (s.phone || "").toLowerCase().includes(q) ||
          (s.parentPhone || "").toLowerCase().includes(q) ||
          (s.id || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [students, filters]);

  const handleExportPDF = () => {
    exportPDF(
      "Öğrenci Listesi",
      [
        { header: "E-posta", key: "email" },
        { header: "Ad Soyad", key: "fullName" },
        { header: "TC Kimlik", key: "identityNumber" },
        { header: "Telefon", key: "phone" },
        { header: "Veli Tel.", key: "parentPhone" },
        { header: "Sınıf ID", key: "classId" },
      ],
      filteredStudents.map((s) => ({
        email: s.email,
        fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || "-",
        identityNumber: s.identityNumber || "-",
        phone: s.phone || "-",
        parentPhone: s.parentPhone || "-",
        classId: s.classId || "-",
      })),
      "ogrenci-listesi"
    );
  };

  const handleExportExcel = () => {
    exportExcel(
      "Öğrenci Listesi",
      [
        { header: "E-posta", key: "email", width: 30 },
        { header: "Ad Soyad", key: "fullName", width: 25 },
        { header: "TC Kimlik", key: "identityNumber", width: 15 },
        { header: "Telefon", key: "phone", width: 15 },
        { header: "Veli Tel.", key: "parentPhone", width: 15 },
        { header: "Sınıf ID", key: "classId", width: 40 },
        { header: "ID", key: "id", width: 40 },
      ],
      filteredStudents.map((s) => ({
        email: s.email,
        fullName: `${s.firstName || ''} ${s.lastName || ''}`.trim() || "-",
        identityNumber: s.identityNumber || "-",
        phone: s.phone || "-",
        parentPhone: s.parentPhone || "-",
        classId: s.classId || "-",
        id: s.id,
      })),
      "ogrenci-listesi"
    );
  };

  return (
    <div className="admin-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>Öğrenci Listesi</h1>
        <button className="admin-btn-primary" onClick={() => setShowAddModal(true)}>
          ➕ Yeni Öğrenci Ekle
        </button>
      </div>

      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Öğrenci</span>
          <div className="stat-value">{students.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Filtrelenen</span>
          <div className="stat-value" style={{ color: "#818cf8" }}>{filteredStudents.length}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Veli Telefonu Kayıtlı</span>
          <div className="stat-value text-green">
            {students.filter((s) => s.parentPhone).length}
          </div>
        </div>
      </div>

      <FilterPanel
        filters={filters}
        onChange={setFilters}
        onApply={() => {}}
        onReset={() => setFilters(EMPTY_FILTER)}
        showClassFilter
        showSearch
        classes={classes}
        extraActions={
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <label className="admin-btn-sm" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", cursor: "pointer" }}>
              📥 İçe Aktar
              <input type="file" accept=".xlsx, .xls, .csv" hidden onChange={handleImportExcel} />
            </label>
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
            <tr><th>Ad Soyad</th><th>E-posta</th><th>TC Kimlik</th><th>Telefon</th><th>Veli Tel.</th><th>İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6}>Yükleniyor...</td></tr>}
            {!loading && filteredStudents.length === 0 && <tr><td colSpan={6}>Kriterlere uyan öğrenci bulunamadı.</td></tr>}
            {filteredStudents.map((s) => (
              <tr key={s.id}>
                <td>{`${s.firstName || ''} ${s.lastName || ''}`.trim() || "—"}</td>
                <td>{s.email}</td>
                <td>{s.identityNumber || "—"}</td>
                <td>{s.phone || "—"}</td>
                <td>{s.parentPhone || "—"}</td>
                <td style={{ display: "flex", gap: "6px" }}>
                  <Link href={`/admin/students/${s.id}`} className="admin-btn-sm" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#a5b4fc" }}>Karnesi</Link>
                  <button
                    className="admin-btn-sm"
                    onClick={() => {
                      setEditForm({
                        id: s.id,
                        firstName: s.firstName || "",
                        lastName: s.lastName || "",
                        classId: s.classId || "",
                        identityNumber: s.identityNumber || "",
                        phone: s.phone || "",
                        parentPhone: s.parentPhone || "",
                      });
                      setShowEditModal(true);
                    }}
                    style={{ background: "rgba(245, 158, 11, 0.15)", color: "#fcd34d" }}
                  >
                    Düzenle
                  </button>
                  <button
                    className="admin-btn-sm"
                    onClick={() => handleDeleteStudent(s.id)}
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

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Yeni Öğrenci Ekle</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            </div>
            <form onSubmit={handleAddStudent}>
              <div className="form-group" style={{ marginBottom: "12px" }}>
                <label className="form-label">E-posta (Zorunlu)</label>
                <input
                  type="email"
                  className="admin-input"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="ogrenci@okul.com"
                  required
                />
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Ad</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={addForm.firstName}
                    onChange={(e) => setAddForm({ ...addForm, firstName: e.target.value })}
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Soyad</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={addForm.lastName}
                    onChange={(e) => setAddForm({ ...addForm, lastName: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Sınıf</label>
                  <select
                    className="admin-input"
                    value={addForm.classId}
                    onChange={(e) => setAddForm({ ...addForm, classId: e.target.value })}
                    style={{ width: "100%" }}
                  >
                    <option value="">Sınıf Seçin</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">TC Kimlik No</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={addForm.identityNumber}
                    onChange={(e) => setAddForm({ ...addForm, identityNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Telefon</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    placeholder="05xxxxxxxxx"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Veli Telefonu</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={addForm.parentPhone}
                    onChange={(e) => setAddForm({ ...addForm, parentPhone: e.target.value })}
                    placeholder="05xxxxxxxxx"
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="admin-btn-sm" onClick={() => setShowAddModal(false)} style={{ background: "rgba(255,255,255,0.1)" }}>İptal</button>
                <button type="submit" className="admin-btn-primary">Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Student Modal */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Öğrenci Bilgilerini Düzenle</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEditStudent}>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Ad</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editForm.firstName}
                    onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Soyad</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editForm.lastName}
                    onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Sınıf</label>
                  <select
                    className="admin-input"
                    value={editForm.classId}
                    onChange={(e) => setEditForm({ ...editForm, classId: e.target.value })}
                    style={{ width: "100%" }}
                  >
                    <option value="">Sınıf Yok</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">TC Kimlik No</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editForm.identityNumber}
                    onChange={(e) => setEditForm({ ...editForm, identityNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-row" style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Telefon</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="05xxxxxxxxx"
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label">Veli Telefonu</label>
                  <input
                    type="text"
                    className="admin-input"
                    value={editForm.parentPhone}
                    onChange={(e) => setEditForm({ ...editForm, parentPhone: e.target.value })}
                    placeholder="05xxxxxxxxx"
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "20px" }}>
                <button type="button" className="admin-btn-sm" onClick={() => setShowEditModal(false)} style={{ background: "rgba(255,255,255,0.1)" }}>İptal</button>
                <button type="submit" className="admin-btn-primary">Güncelle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

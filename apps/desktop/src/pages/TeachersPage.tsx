import React, { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconPlus, IconClose, IconRefresh } from "../components/Icons";

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ email: "", firstName: "", lastName: "", phone: "" });
  const [editForm, setEditForm] = useState({ id: "", firstName: "", lastName: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiRequest("GET", "/api/admin/teachers");
      setTeachers(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error fetching teachers", e);
      setTeachers([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/teachers", {
        email: form.email.trim(),
        firstName: form.firstName.trim() || undefined,
        lastName: form.lastName.trim() || undefined,
        phone: form.phone.trim() || undefined,
      });
      setShowCreate(false);
      setForm({ email: "", firstName: "", lastName: "", phone: "" });
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      await apiRequest("PUT", "/api/admin/teachers", editForm);
      alert("Öğretmen başarıyla güncellendi.");
      setShowEdit(false);
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu öğretmeni silmek istediğinize emin misiniz? Giriş yetkisi de kaldırılacaktır.")) return;
    try {
      await apiRequest("DELETE", `/api/admin/teachers?id=${id}`);
      alert("Öğretmen silindi.");
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Öğretmen Yönetimi</h2>
        <p>Kurum öğretmenlerini ekleyin ve yönetin</p>
      </div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <IconPlus /> Yeni Öğretmen
          </button>
          <div className="toolbar-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={load}>
            <IconRefresh />
          </button>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" />
          </div>
        ) : (
          <div className="card">
            <div className="card-title">
              <span>👩‍🏫</span> Kayıtlı Öğretmenler
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>E-posta</th>
                    <th>Telefon</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {teachers.length === 0 ? (
                    <tr>
                      <td colSpan={4}>
                        <div className="empty-state">
                          <p>Henüz öğretmen eklenmemiş.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    teachers.map((t) => (
                      <tr key={t.id}>
                        <td style={{ fontWeight: 600, color: "var(--text-main)" }}>
                          {`${t.firstName || ""} ${t.lastName || ""}`.trim() || "—"}
                        </td>
                        <td>{t.email}</td>
                        <td>{t.phone || "Belirtilmedi"}</td>
                        <td style={{ display: "flex", gap: "6px" }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditForm({
                                id: t.id,
                                firstName: t.firstName || "",
                                lastName: t.lastName || "",
                                phone: t.phone || "",
                              });
                              setShowEdit(true);
                            }}
                          >
                            Düzenle
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => handleDelete(t.id)}
                            style={{ color: "var(--danger)" }}
                          >
                            Sil
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Yeni Öğretmen Ekle</h3>
                <button className="modal-close" onClick={() => setShowCreate(false)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">E-posta *</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="ogretmen@kurum.com"
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                      placeholder="Adı"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Soyad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                      placeholder="Soyadı"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="05XXXXXXXXX"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? "Kaydediliyor..." : "Ekle"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showEdit && (
          <div className="modal-overlay" onClick={() => setShowEdit(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Öğretmen Düzenle</h3>
                <button className="modal-close" onClick={() => setShowEdit(false)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleEdit}>
                <div style={{ display: "flex", gap: "12px" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Ad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.firstName}
                      onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">Soyad</label>
                    <input
                      type="text"
                      className="form-input"
                      value={editForm.lastName}
                      onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Telefon</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    placeholder="05XXXXXXXXX"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowEdit(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={updating}>
                    {updating ? "Kaydediliyor..." : "Kaydet"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

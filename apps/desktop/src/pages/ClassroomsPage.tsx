import React, { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconPlus, IconClose, IconRefresh } from "../components/Icons";

export default function ClassroomsPage() {
  const [classrooms, setClassrooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", capacity: 20 });
  const [saving, setSaving] = useState(false);

  // Edit states
  const [editingClassroom, setEditingClassroom] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ id: "", name: "", capacity: 20 });

  const load = async () => {
    setLoading(true);
    try {
      const res: any = await apiRequest("GET", "/api/admin/classrooms");
      setClassrooms(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error("Error fetching classrooms", e);
      setClassrooms([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/classrooms", {
        name: form.name,
        capacity: Number(form.capacity)
      });
      setShowCreate(false);
      setForm({ name: "", capacity: 20 });
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.id) return;
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/admin/classrooms", {
        id: editForm.id,
        name: editForm.name.trim(),
        capacity: Number(editForm.capacity)
      });
      setEditingClassroom(null);
      load();
    } catch (err: any) {
      alert("Hata: " + (err?.message || err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu dersliği silmek istediğinize emin misiniz?")) return;
    try {
      await apiRequest("DELETE", `/api/admin/classrooms?id=${id}`);
      setClassrooms((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    }
  };

  return (
    <>
      <div className="page-header"><h2>Derslik Yönetimi</h2><p>Kurum dersliklerini ve kapasitelerini yönetin</p></div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><IconPlus /> Yeni Derslik</button>
          <div className="toolbar-spacer" />
          <button className="btn btn-ghost btn-sm" onClick={load}><IconRefresh /></button>
        </div>

        {loading ? <div className="loading-overlay"><div className="spinner" /></div> : (
          <div className="card">
            <div className="card-title flex justify-between items-center">
              <span>🏢</span> Derslikler ve Kapasiteler
            </div>
            
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>Derslik Adı</th><th>Kişi Kapasitesi</th><th>ID</th><th style={{ width: "100px" }}>İşlem</th></tr>
                </thead>
                <tbody>
                  {classrooms.length === 0 ? <tr><td colSpan={4}><div className="empty-state"><p>Henüz derslik eklenmemiş.</p></div></td></tr> :
                    classrooms.map((c) => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{c.name}</td>
                        <td>
                          <span className="badge success">{c.capacity} Kişi</span>
                        </td>
                        <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)" }}>{c.id}</td>
                        <td>
                          <div style={{ display: "flex", gap: "8px" }}>
                            <button className="btn btn-ghost btn-sm" onClick={() => {
                              setEditingClassroom(c);
                              setEditForm({ id: c.id, name: c.name, capacity: c.capacity });
                            }}>Düzenle</button>
                            <button className="btn btn-ghost btn-sm" style={{ color: "var(--danger)" }} onClick={() => handleDelete(c.id)}>Sil</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Yeni Derslik Ekle</h3><button className="modal-close" onClick={() => setShowCreate(false)}><IconClose /></button></div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Derslik Adı</label>
                  <input className="form-input" value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Örn: 101, Fizik Laboratuvarı" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Kapasite (Kişi Sayısı)</label>
                  <input className="form-input" type="number" value={form.capacity} onChange={(e) => setForm({...form, capacity: Number(e.target.value)})} placeholder="20" required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>Ekle</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit modal */}
        {editingClassroom && (
          <div className="modal-overlay" onClick={() => setEditingClassroom(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header"><h3>Dersliği Düzenle</h3><button className="modal-close" onClick={() => setEditingClassroom(null)}><IconClose /></button></div>
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label className="form-label">Derslik Adı</label>
                  <input className="form-input" value={editForm.name} onChange={(e) => setEditForm({...editForm, name: e.target.value})} placeholder="Örn: 101, Fizik Laboratuvarı" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Kapasite (Kişi Sayısı)</label>
                  <input className="form-input" type="number" value={editForm.capacity} onChange={(e) => setEditForm({...editForm, capacity: Number(e.target.value)})} placeholder="20" required />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingClassroom(null)}>İptal</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>Kaydet</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

import { useState, useEffect } from "react";
import { apiRequest } from "../hooks/useApi";
import { IconPlus, IconClose, IconRefresh } from "../components/Icons";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", telegramGroupId: "" });

  // Edit State
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", telegramGroupId: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiRequest("GET", "/api/admin/classes");
      setClasses(Array.isArray(r) ? r : []);
    } catch {
      setClasses([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      await apiRequest("POST", "/api/admin/classes", {
        name: form.name.trim(),
        telegramGroupId: form.telegramGroupId.trim() || null
      });
      setShowCreate(false);
      setForm({ name: "", telegramGroupId: "" });
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: any) => {
    setEditingClass(c);
    setEditForm({
      name: c.name,
      telegramGroupId: c.telegramGroupId || ""
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name.trim()) return;
    setSaving(true);
    try {
      await apiRequest("PUT", "/api/admin/classes", {
        id: editingClass.id,
        name: editForm.name.trim(),
        telegramGroupId: editForm.telegramGroupId.trim() || null
      });
      setEditingClass(null);
      load();
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sınıfı silmek istediğinize emin misiniz? Sınıfa kayıtlı öğrenciler etkilenebilir.")) return;
    try {
      await apiRequest("DELETE", `/api/admin/classes?id=${id}`);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      alert("Hata: " + (e?.message || e));
    }
  };

  return (
    <>
      <div className="page-header">
        <h2>Sınıf Yönetimi</h2>
        <p>Sınıfları oluşturun ve yönetin</p>
      </div>
      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <IconPlus /> Yeni Sınıf
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
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Sınıf Adı</th>
                  <th>Telegram Grup ID</th>
                  <th>Kurum ID</th>
                  <th style={{ width: "150px" }}>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {classes.length === 0 ? (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <p>Henüz sınıf yok</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  classes.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 600, color: "var(--text-main)" }}>{c.name}</td>
                      <td>{c.telegramGroupId || "-"}</td>
                      <td className="truncate">{c.tenantId || "-"}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>
                            Düzenle
                          </button>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ color: "var(--danger)" }}
                            onClick={() => handleDelete(c.id)}
                          >
                            Sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {showCreate && (
          <div className="modal-overlay" onClick={() => setShowCreate(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Yeni Sınıf</h3>
                <button className="modal-close" onClick={() => setShowCreate(false)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label className="form-label">Sınıf Adı</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Örn: 12-A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telegram Grup ID (Opsiyonel)</label>
                  <input
                    className="form-input"
                    value={form.telegramGroupId}
                    onChange={(e) => setForm({ ...form, telegramGroupId: e.target.value })}
                    placeholder="-100123456789"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setShowCreate(false)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !form.name}>
                    {saving ? "Oluşturuluyor..." : "Oluştur"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingClass && (
          <div className="modal-overlay" onClick={() => setEditingClass(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Sınıfı Düzenle</h3>
                <button className="modal-close" onClick={() => setEditingClass(null)}>
                  <IconClose />
                </button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="form-group">
                  <label className="form-label">Sınıf Adı</label>
                  <input
                    className="form-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Örn: 12-A"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Telegram Grup ID (Opsiyonel)</label>
                  <input
                    className="form-input"
                    value={editForm.telegramGroupId}
                    onChange={(e) => setEditForm({ ...editForm, telegramGroupId: e.target.value })}
                    placeholder="-100123456789"
                  />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setEditingClass(null)}>
                    İptal
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving || !editForm.name}>
                    {saving ? "Kaydediliyor..." : "Kaydet"}
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

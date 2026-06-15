"use client";
import { useState, useEffect } from "react";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [newName, setNewName] = useState("");
  const [newTelegramGroupId, setNewTelegramGroupId] = useState("");
  const [loading, setLoading] = useState(true);

  // Edit State
  const [editingClass, setEditingClass] = useState<any | null>(null);
  const [editName, setEditName] = useState("");
  const [editTelegramGroupId, setEditTelegramGroupId] = useState("");

  useEffect(() => {
    fetch("/api/admin/classes").then((r) => r.json()).then(setClasses).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const res = await fetch("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName, telegramGroupId: newTelegramGroupId || null }),
    });
    const created = await res.json();
    setClasses((prev) => [...prev, created]);
    setNewName("");
    setNewTelegramGroupId("");
  };

  const startEdit = (c: any) => {
    setEditingClass(c);
    setEditName(c.name);
    setEditTelegramGroupId(c.telegramGroupId || "");
  };

  const handleUpdate = async () => {
    if (!editName.trim()) return;
    const res = await fetch("/api/admin/classes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingClass.id, name: editName, telegramGroupId: editTelegramGroupId || null }),
    });
    const updated = await res.json();
    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setEditingClass(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu sınıfı silmek istediğinize emin misiniz? Sınıfa kayıtlı öğrenciler etkilenebilir.")) return;
    const res = await fetch(`/api/admin/classes?id=${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } else {
      alert("Silme işlemi başarısız.");
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Sınıf Yönetimi</h1>

      <div className="admin-form-row" style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          className="admin-input"
          style={{ flex: 1, minWidth: "200px" }}
          placeholder="Yeni sınıf adı (Örn: 12-A)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <input
          className="admin-input"
          style={{ flex: 1, minWidth: "200px" }}
          placeholder="Telegram Grup ID (Örn: -100123456789)"
          value={newTelegramGroupId}
          onChange={(e) => setNewTelegramGroupId(e.target.value)}
        />
        <button className="admin-btn-primary" onClick={handleCreate}>Sınıf Ekle</button>
      </div>

      <div className="admin-table-wrapper" style={{ marginTop: "24px" }}>
        <table className="admin-table">
          <thead>
            <tr><th>Sınıf Adı</th><th>Telegram Grup</th><th>ID</th><th style={{ width: "150px" }}>İşlem</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}>Yükleniyor...</td></tr>}
            {!loading && classes.length === 0 && <tr><td colSpan={4}>Henüz sınıf eklenmemiş.</td></tr>}
            {classes.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.name}</strong></td>
                <td>{c.telegramGroupId || "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: 11, color: "var(--text-secondary)" }}>{c.id}</td>
                <td>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="admin-btn-sm" onClick={() => startEdit(c)}>Düzenle</button>
                    <button className="admin-btn-sm" style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }} onClick={() => handleDelete(c.id)}>Sil</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingClass && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div className="stat-card" style={{ width: "400px", padding: "24px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            <h3 style={{ marginTop: 0, marginBottom: "16px" }}>Sınıfı Düzenle</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Sınıf Adı</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Telegram Grup ID</label>
                <input
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={editTelegramGroupId}
                  onChange={(e) => setEditTelegramGroupId(e.target.value)}
                  placeholder="-100123456789"
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button className="admin-btn-sm" style={{ background: "transparent" }} onClick={() => setEditingClass(null)}>İptal</button>
              <button className="admin-btn-primary" onClick={handleUpdate}>Kaydet</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

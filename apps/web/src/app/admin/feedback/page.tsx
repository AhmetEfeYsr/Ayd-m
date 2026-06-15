"use client";

import { useState, useEffect, useMemo } from "react";

interface FeedbackItem {
  id: string;
  userId: string | null;
  email: string | null;
  errorCode: string | null;
  module: string;
  part: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  } | null;
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL"); // ALL, OPEN, IN_PROGRESS, RESOLVED, CLOSED

  // Edit/Detail Modal State
  const [selectedItem, setSelectedItem] = useState<FeedbackItem | null>(null);
  const [editModule, setEditModule] = useState("");
  const [editPart, setEditPart] = useState("");
  const [editErrorCode, setEditErrorCode] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<FeedbackItem["status"]>("OPEN");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/feedback");
      const data = await res.json();
      if (Array.isArray(data)) {
        setFeedbacks(data);
      }
    } catch (err) {
      console.error("Geri bildirimler yüklenirken hata:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (item: FeedbackItem) => {
    setSelectedItem(item);
    setEditModule(item.module);
    setEditPart(item.part);
    setEditErrorCode(item.errorCode || "");
    setEditDescription(item.description);
    setEditStatus(item.status);
    setEditNotes(item.notes || "");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/feedback/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module: editModule,
          part: editPart,
          errorCode: editErrorCode || null,
          description: editDescription,
          status: editStatus,
          notes: editNotes || null,
        }),
      });

      if (res.ok) {
        setSelectedItem(null);
        fetchFeedbacks();
      } else {
        const data = await res.json();
        alert(data.error || "Güncelleme başarısız.");
      }
    } catch (err) {
      console.error(err);
      alert("Güncelleme sırasında hata oluştu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Bu geri bildirimi tamamen silmek istediğinize emin misiniz?")) return;

    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchFeedbacks();
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      } else {
        const data = await res.json();
        alert(data.error || "Silme işlemi başarısız.");
      }
    } catch (err) {
      console.error(err);
      alert("Silme sırasında hata oluştu.");
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const total = feedbacks.length;
    const open = feedbacks.filter((f) => f.status === "OPEN").length;
    const inProgress = feedbacks.filter((f) => f.status === "IN_PROGRESS").length;
    const resolved = feedbacks.filter((f) => f.status === "RESOLVED").length;
    const closed = feedbacks.filter((f) => f.status === "CLOSED").length;
    return { total, open, inProgress, resolved, closed };
  }, [feedbacks]);

  // Filtered feedbacks
  const filteredFeedbacks = useMemo(() => {
    let result = [...feedbacks];

    // Status filter
    if (statusFilter !== "ALL") {
      result = result.filter((f) => f.status === statusFilter);
    }

    // Search query filter
    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => {
        const reporterName = f.user
          ? `${f.user.firstName || ""} ${f.user.lastName || ""}`.toLowerCase()
          : "";
        const reporterEmail = (f.email || f.user?.email || "").toLowerCase();
        const descText = f.description.toLowerCase();
        const code = (f.errorCode || "").toLowerCase();
        const mod = f.module.toLowerCase();
        const pt = f.part.toLowerCase();

        return (
          reporterName.includes(q) ||
          reporterEmail.includes(q) ||
          descText.includes(q) ||
          code.includes(q) ||
          mod.includes(q) ||
          pt.includes(q)
        );
      });
    }

    return result;
  }, [feedbacks, statusFilter, searchQuery]);

  const getStatusBadge = (status: FeedbackItem["status"]) => {
    switch (status) {
      case "OPEN":
        return (
          <span className="topic-badge" style={{ background: "rgba(239, 68, 68, 0.15)", color: "#f87171" }}>
            Açık
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="topic-badge" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#60a5fa" }}>
            İncelemede
          </span>
        );
      case "RESOLVED":
        return (
          <span className="topic-badge" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34d399" }}>
            Çözüldü
          </span>
        );
      case "CLOSED":
        return (
          <span className="topic-badge" style={{ background: "rgba(255, 255, 255, 0.08)", color: "#a1a1aa" }}>
            Kapatıldı
          </span>
        );
    }
  };

  return (
    <div className="admin-page">
      <h1 className="admin-page-title">Geri Bildirimler ve Hata Raporları</h1>

      {/* Stats Summary */}
      <div className="admin-stats-grid" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <span className="stat-label">Toplam Rapor</span>
          <div className="stat-value">{stats.total}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Açık Hatalar</span>
          <div className="stat-value" style={{ color: "#f87171" }}>
            {stats.open}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">İncelemedekiler</span>
          <div className="stat-value" style={{ color: "#60a5fa" }}>
            {stats.inProgress}
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Çözülen / Kapatılan</span>
          <div className="stat-value text-green">
            {stats.resolved + stats.closed}
          </div>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="stat-card" style={{ marginBottom: 24, padding: "20px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", justifyContent: "space-between", alignItems: "center" }}>
          {/* Status Tab buttons */}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {[
              { id: "ALL", label: "Tümü" },
              { id: "OPEN", label: "Açık" },
              { id: "IN_PROGRESS", label: "İncelemede" },
              { id: "RESOLVED", label: "Çözüldü" },
              { id: "CLOSED", label: "Kapatıldı" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className="admin-btn-sm"
                style={{
                  background: statusFilter === tab.id ? "#3b82f6" : "rgba(255,255,255,0.05)",
                  color: statusFilter === tab.id ? "white" : "var(--text-secondary)",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div style={{ position: "relative", minWidth: "260px" }}>
            <input
              type="text"
              className="admin-input"
              style={{ width: "100%", paddingLeft: "14px" }}
              placeholder="Ara (Modül, açıklama, e-posta...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th style={{ width: "110px" }}>Tarih</th>
              <th>Gönderen</th>
              <th>Modül / Kısım</th>
              <th style={{ width: "110px" }}>Hata Kodu</th>
              <th>Açıklama</th>
              <th style={{ width: "100px" }}>Durum</th>
              <th style={{ width: "140px" }}>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "16px 0" }}>
                  Yükleniyor...
                </td>
              </tr>
            )}
            {!loading && filteredFeedbacks.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "16px 0", color: "var(--text-secondary)" }}>
                  Geri bildirim bulunamadı.
                </td>
              </tr>
            )}
            {!loading &&
              filteredFeedbacks.map((item) => {
                const reporterName = item.user
                  ? `${item.user.firstName || ""} ${item.user.lastName || ""}`
                  : "Anonim / Dış İstemci";
                const reporterEmail = item.email || item.user?.email || "—";

                return (
                  <tr key={item.id}>
                    <td style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                      {new Date(item.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{reporterName}</div>
                      <div style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{reporterEmail}</div>
                    </td>
                    <td>
                      <div>{item.module}</div>
                      <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>{item.part}</div>
                    </td>
                    <td style={{ fontFamily: "monospace", fontSize: "12px" }}>
                      {item.errorCode ? (
                        <span style={{ color: "#fca5a5", background: "rgba(239,68,68,0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                          {item.errorCode}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ maxWidth: "250px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {item.description}
                    </td>
                    <td>{getStatusBadge(item.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button className="admin-btn-sm" onClick={() => handleEditClick(item)}>
                          Düzenle
                        </button>
                        <button
                          className="admin-btn-sm"
                          style={{ color: "#fca5a5", background: "rgba(239, 68, 68, 0.15)" }}
                          onClick={() => handleDelete(item.id)}
                        >
                          Sil
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      {selectedItem && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => {
            if (!saving) setSelectedItem(null);
          }}
        >
          <div
            className="stat-card"
            style={{
              width: "100%",
              maxWidth: "550px",
              padding: "24px",
              background: "var(--bg-color)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--glass-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: "8px", fontSize: "18px" }}>Geri Bildirim Detayları</h3>
            <p style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "20px" }}>
              Kullanıcı tarafından gönderilen hatalı bilgileri düzeltebilir veya bilet durumunu güncelleyebilirsiniz.
            </p>

            <form onSubmit={handleUpdate}>
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "20px" }}>
                {/* Meta details (Readonly) */}
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    fontSize: "13px",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Gönderen:</span>{" "}
                    <strong>
                      {selectedItem.user
                        ? `${selectedItem.user.firstName || ""} ${selectedItem.user.lastName || ""}`
                        : "Anonim"}
                    </strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>E-posta:</span>{" "}
                    <strong>{selectedItem.email || selectedItem.user?.email || "Yok"}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Oluşturma:</span>{" "}
                    <strong>{new Date(selectedItem.createdAt).toLocaleString("tr-TR")}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--text-secondary)" }}>Güncelleme:</span>{" "}
                    <strong>{new Date(selectedItem.updatedAt).toLocaleString("tr-TR")}</strong>
                  </div>
                </div>

                {/* Edit Module */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Modül *
                  </label>
                  <select
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editModule}
                    onChange={(e) => setEditModule(e.target.value)}
                    required
                  >
                    <option value="Öğrenci Paneli">Öğrenci Paneli</option>
                    <option value="Öğretmen Paneli">Öğretmen Paneli</option>
                    <option value="Admin Paneli">Admin Paneli</option>
                    <option value="Veli Paneli">Veli Paneli</option>
                    <option value="Masaüstü Uygulama">Masaüstü Uygulama</option>
                    <option value="Mobil Uygulama">Mobil Uygulama</option>
                    <option value="Giriş / Kayıt">Giriş / Kayıt</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                {/* Edit Part */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Kısım / Sayfa *
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editPart}
                    onChange={(e) => setEditPart(e.target.value)}
                    required
                  />
                </div>

                {/* Edit Error Code */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Hata Kodu
                  </label>
                  <input
                    type="text"
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editErrorCode}
                    onChange={(e) => setEditErrorCode(e.target.value)}
                  />
                </div>

                {/* Edit Description */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Açıklama *
                  </label>
                  <textarea
                    rows={3}
                    className="admin-input"
                    style={{ width: "100%", resize: "none" }}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    required
                  />
                </div>

                {/* Edit Status */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Bilet Durumu *
                  </label>
                  <select
                    className="admin-input"
                    style={{ width: "100%" }}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    required
                  >
                    <option value="OPEN">Açık</option>
                    <option value="IN_PROGRESS">İncelemede</option>
                    <option value="RESOLVED">Çözüldü</option>
                    <option value="CLOSED">Kapatıldı</option>
                  </select>
                </div>

                {/* Edit Admin Notes */}
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    Yönetici Notları (Sadece admin görebilir)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Bu hata hakkında alınan önlemler, çözüm notları vb."
                    className="admin-input"
                    style={{ width: "100%", resize: "none" }}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  className="admin-btn-sm"
                  style={{ background: "transparent" }}
                  onClick={() => setSelectedItem(null)}
                  disabled={saving}
                >
                  İptal
                </button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

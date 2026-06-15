"use client";
import { useState, useEffect } from "react";

export default function SMSPage() {
  const [activeTab, setActiveTab] = useState<"send" | "settings">("send");
  const [templates, setTemplates] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Send Form State
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateContent, setTemplateContent] = useState("");
  const [targetType, setTargetType] = useState("ALL"); // ALL, CLASS, STUDENT
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  // Settings State
  const [smsUsername, setSmsUsername] = useState("");
  const [smsPassword, setSmsPassword] = useState("");
  const [smsSenderId, setSmsSenderId] = useState("");
  const [whatsappApiEndpoint, setWhatsappApiEndpoint] = useState("");
  const [whatsappApiToken, setWhatsappApiToken] = useState("");
  const [saveSettingsLoading, setSaveSettingsLoading] = useState(false);
  const [saveSettingsResult, setSaveSettingsResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/sms/templates").then((r) => r.json()),
      fetch("/api/admin/classes").then((r) => r.json()),
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/admin/settings").then((r) => r.json()),
    ])
    .then(([tmpl, cls, std, settings]) => {
      if (Array.isArray(tmpl)) setTemplates(tmpl);
      if (Array.isArray(cls)) setClasses(cls);
      if (Array.isArray(std)) setStudents(std);
      if (settings && !settings.error) {
        setSmsUsername(settings.smsUsername || "");
        setSmsPassword(settings.smsPassword || "");
        setSmsSenderId(settings.smsSenderId || "");
        setWhatsappApiEndpoint(settings.whatsappApiEndpoint || "");
        setWhatsappApiToken(settings.whatsappApiToken || "");
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    const tmpl = templates.find((t) => t.id === id);
    if (tmpl) {
      setTemplateContent(tmpl.content);
    } else {
      setTemplateContent("");
    }
  };

  const handleStudentCheckboxChange = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    setSending(true);
    setResult(null);

    // Resolve recipientIds based on selection
    let recipientIds: string[] = [];
    if (targetType === "CLASS") {
      recipientIds = students.filter((s) => s.classId === selectedClassId).map((s) => s.id);
    } else if (targetType === "STUDENT") {
      recipientIds = selectedStudentIds;
    } else {
      recipientIds = students.map((s) => s.id);
    }

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateContent, recipientIds }),
      });
      const data = await res.json();
      setResult(res.ok && data.success ? `${data.sent} SMS başarıyla gönderildi.` : "Hata: " + (data.error || JSON.stringify(data)));
    } catch (e) {
      setResult("Gönderim hatası.");
    } finally {
      setSending(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSettingsLoading(true);
    setSaveSettingsResult(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smsUsername,
          smsPassword,
          smsSenderId,
          whatsappApiEndpoint,
          whatsappApiToken,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveSettingsResult("Ayarlar başarıyla kaydedildi.");
      } else {
        setSaveSettingsResult("Hata: " + (data.error || "Ayarlar kaydedilemedi."));
      }
    } catch (err) {
      setSaveSettingsResult("Kaydetme hatası.");
    } finally {
      setSaveSettingsLoading(false);
    }
  };

  if (loading) return <div className="admin-page">Yükleniyor...</div>;

  return (
    <div className="admin-page" style={{ fontFamily: "'Outfit', 'Inter', sans-serif" }}>
      
      {/* Tab Navigation */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 className="admin-page-title" style={{ margin: 0 }}>İletişim & Entegrasyon Merkezi</h1>
        <div 
          style={{ 
            display: "flex", 
            background: "rgba(255,255,255,0.03)", 
            padding: "4px", 
            borderRadius: "12px", 
            border: "1px solid rgba(255,255,255,0.06)" 
          }}
        >
          <button
            onClick={() => setActiveTab("send")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              background: activeTab === "send" ? "#6366f1" : "transparent",
              color: activeTab === "send" ? "#fff" : "#a1a1aa",
              transition: "all 0.2s ease"
            }}
          >
            💬 Mesaj Gönder
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "8px 16px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: 600,
              background: activeTab === "settings" ? "#6366f1" : "transparent",
              color: activeTab === "settings" ? "#fff" : "#a1a1aa",
              transition: "all 0.2s ease"
            }}
          >
            ⚙️ API & Netgsm Ayarları
          </button>
        </div>
      </div>

      {activeTab === "send" ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* Left Side: Template and Content */}
          <div className="stat-card">
            <h2 className="section-title">💬 SMS Şablonu</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Hazır Şablon Seçin</label>
              <select
                className="admin-input"
                style={{ width: "100%" }}
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                <option value="">Boş Şablon (Kendin Yaz)</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Mesaj İçeriği</label>
              <textarea
                className="admin-input"
                rows={6}
                style={{ width: "100%", resize: "vertical" }}
                value={templateContent}
                onChange={(e) => setTemplateContent(e.target.value)}
                placeholder="Mesajınızı girin..."
              />
              <p style={{ color: "var(--text-secondary)", fontSize: 11, marginTop: 8 }}>
                Kullanılabilir dinamik alanlar: {"{student_name}"}
              </p>
            </div>

            <button className="admin-btn-primary" style={{ width: "100%" }} onClick={handleSend} disabled={sending || !templateContent.trim()}>
              {sending ? "Gönderiliyor..." : "Toplu SMS Gönder"}
            </button>

            {result && (
              <p style={{ color: result.startsWith("Hata") ? "#ef4444" : "#10b981", marginTop: 12, fontSize: 14 }}>
                {result}
              </p>
            )}
          </div>

          {/* Right Side: Recipients */}
          <div className="stat-card">
            <h2 className="section-title">👥 Alıcı Seçimi</h2>
            
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Gönderim Kapsamı</label>
              <div style={{ display: "flex", gap: "12px" }}>
                <label style={{ fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="radio" name="target" checked={targetType === "ALL"} onChange={() => setTargetType("ALL")} />
                  Tüm Öğrenciler ({students.length})
                </label>
                <label style={{ fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="radio" name="target" checked={targetType === "CLASS"} onChange={() => setTargetType("CLASS")} />
                  Sınıf Bazlı
                </label>
                <label style={{ fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <input type="radio" name="target" checked={targetType === "STUDENT"} onChange={() => setTargetType("STUDENT")} />
                  Öğrenci Seçerek
                </label>
              </div>
            </div>

            {targetType === "CLASS" && (
              <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Sınıf Seçin</label>
                <select
                  className="admin-input"
                  style={{ width: "100%" }}
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                >
                  <option value="">Sınıf Seçin</option>
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {targetType === "STUDENT" && (
              <div>
                <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 6 }}>Öğrencileri Seçin ({selectedStudentIds.length} seçildi)</label>
                <div className="admin-table-wrapper" style={{ maxHeight: "250px", overflowY: "auto", border: "1px solid var(--border)" }}>
                  <table className="admin-table">
                    <tbody>
                      {students.map((s) => (
                        <tr key={s.id}>
                          <td style={{ width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={selectedStudentIds.includes(s.id)}
                              onChange={() => handleStudentCheckboxChange(s.id)}
                            />
                          </td>
                          <td>{`${s.firstName || ""} ${s.lastName || ""}`.trim() || s.email}</td>
                          <td style={{ fontSize: 11, color: "var(--text-secondary)" }}>{s.parentPhone || "Telefon Yok"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

        </div>
      ) : (
        <form onSubmit={handleSaveSettings} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
          
          {/* SMS / Netgsm Settings */}
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <h2 className="section-title">📱 Netgsm SMS Entegrasyonu</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 8px 0", lineHeight: 1.5 }}>
              Netgsm hesabınızın bilgilerini buraya girerek velilere ve öğrencilere kendi başlığınızla SMS gönderilmesini sağlayabilirsiniz.
            </p>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Netgsm Kullanıcı Adı (Genelde telefon numarası veya kurumsal kod)</label>
              <input
                type="text"
                className="admin-input"
                value={smsUsername}
                onChange={(e) => setSmsUsername(e.target.value)}
                placeholder="Örn: 850XXXXXXX veya netgsm_user"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Netgsm Şifresi</label>
              <input
                type="password"
                className="admin-input"
                value={smsPassword}
                onChange={(e) => setSmsPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>SMS Gönderici Başlığı (Alfanumerik Sender ID)</label>
              <input
                type="text"
                className="admin-input"
                value={smsSenderId}
                onChange={(e) => setSmsSenderId(e.target.value)}
                placeholder="Örn: EGITIM_KURUMU"
              />
            </div>
          </div>

          {/* WhatsApp Settings */}
          <div className="stat-card" style={{ display: "flex", flexDirection: "column", gap: "16px", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <h2 className="section-title">💬 WhatsApp Business API Entegrasyonu</h2>
              <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: "0 0 8px 0", lineHeight: 1.5 }}>
                WhatsApp Cloud API / Facebook Developer panelindeki bilgilerinizi girerek doğrudan kendi WhatsApp numaranız üzerinden velilere şablon mesajlar gönderebilirsiniz.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>WhatsApp API Endpoint (Send URL)</label>
                <input
                  type="text"
                  className="admin-input"
                  value={whatsappApiEndpoint}
                  onChange={(e) => setWhatsappApiEndpoint(e.target.value)}
                  placeholder="https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages"
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Access Token (Permanent / Geçici Kod)</label>
                <input
                  type="password"
                  className="admin-input"
                  value={whatsappApiToken}
                  onChange={(e) => setWhatsappApiToken(e.target.value)}
                  placeholder="EAAG..."
                />
              </div>
            </div>

            <div style={{ marginTop: "16px" }}>
              <button 
                type="submit" 
                className="admin-btn-primary" 
                style={{ width: "100%" }} 
                disabled={saveSettingsLoading}
              >
                {saveSettingsLoading ? "Kaydediliyor..." : "Entegrasyon Ayarlarını Kaydet"}
              </button>
              
              {saveSettingsResult && (
                <p 
                  style={{ 
                    color: saveSettingsResult.startsWith("Hata") ? "#ef4444" : "#10b981", 
                    marginTop: 12, 
                    fontSize: 14, 
                    textAlign: "center" 
                  }}
                >
                  {saveSettingsResult}
                </p>
              )}
            </div>
          </div>

        </form>
      )}

    </div>
  );
}

import { useState, useEffect } from "react";
import { getConfig, updateConfig } from "../hooks/useApi";
import { IconSettings } from "../components/Icons";

export default function SettingsPage() {
  const [config, setConfig] = useState({ api_endpoint: "", api_token: "", watch_path: "" });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getConfig().then((c: any) => setConfig(c)).catch(console.error);
  }, []);

  const handleSave = async () => {
    setSaving(true); setSaved(false);
    try { await updateConfig(config); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (e) { console.error(e); }
    setSaving(false);
  };

  const handleLogout = async () => {
    if (!confirm("Oturumunuz sonlandırılacak. Devam etmek istiyor musunuz?")) return;
    await updateConfig({ api_endpoint: config.api_endpoint, api_token: "", watch_path: config.watch_path });
    window.location.reload();
  };

  const isLoggedIn = config.api_token && config.api_token.trim() !== "";

  return (
    <>
      <div className="page-header"><h2>Ayarlar</h2><p>Bağlantı ve uygulama yapılandırması</p></div>
      <div className="page-body">
        <div className="card">
          <div className="card-title"><IconSettings /> Bağlantı Ayarları</div>

          <div className="form-group">
            <label className="form-label">Sunucu Adresi (API Endpoint)</label>
            <input className="form-input" value={config.api_endpoint} onChange={(e) => setConfig({...config, api_endpoint: e.target.value})} placeholder="https://aydim.com" />
            <span style={{fontSize:11, color:"var(--text-muted)"}}>Tüm API istekleri bu adrese gönderilir.</span>
          </div>

          <div className="form-group">
            <label className="form-label">Oturum Durumu</label>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: isLoggedIn ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)", border: `1px solid ${isLoggedIn ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`, borderRadius: 10 }}>
              <span className={`sync-dot ${isLoggedIn ? "online" : "offline"}`} />
              <span style={{ fontSize: 14, fontWeight: 600, color: isLoggedIn ? "#10b981" : "#ef4444" }}>
                {isLoggedIn ? "Oturum Açık" : "Oturum Kapalı"}
              </span>
              {isLoggedIn && (
                <button className="btn btn-ghost btn-sm" onClick={handleLogout} style={{ marginLeft: "auto", color: "#ef4444", fontSize: 12 }}>
                  Çıkış Yap
                </button>
              )}
            </div>
            <span style={{fontSize:11, color:"var(--text-muted)"}}>Giriş bilgileriniz güvenli bir token olarak saklanır. Yeniden giriş yapmak için çıkış yapın.</span>
          </div>

          <div className="form-group">
            <label className="form-label">OMR İzleme Klasörü</label>
            <input className="form-input" value={config.watch_path} onChange={(e) => setConfig({...config, watch_path: e.target.value})} placeholder="C:\OMR_Output" />
            <span style={{fontSize:11, color:"var(--text-muted)"}}>Optik okuyucunun .txt dosyalarını bıraktığı klasör. OMR Monitor sayfasından da seçilebilir.</span>
          </div>

          {saved && <div className="action-bar mb-4">✅ Ayarlar başarıyla kaydedildi!</div>}

          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? <><div className="spinner" /> Kaydediliyor...</> : "Kaydet"}
          </button>
        </div>

        <div className="card mt-4">
          <div className="card-title">Sunucu API Endpoint Haritası</div>
          <p style={{fontSize:12, color:"var(--text-muted)", marginBottom:12}}>Bu uygulama aşağıdaki API uç noktalarına erişim sağlar:</p>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Modül</th><th>Endpoint</th><th>Metod</th></tr></thead>
              <tbody>
                {[
                  ["OMR Sync", "/api/omr/sync", "POST"],
                  ["Sınavlar", "/api/exams", "GET/POST"],
                  ["Sınav Sonuçları", "/api/exams/[id]/results", "GET"],
                  ["Öğrenciler", "/api/students", "GET"],
                  ["Öğrenci Sonuçları", "/api/students/[id]/results", "GET"],
                  ["Yoklama", "/api/attendance", "GET/POST"],
                  ["Sınıflar", "/api/admin/classes", "GET/POST"],
                  ["SMS Gönder", "/api/sms/send", "POST"],
                  ["Telegram Rapor", "/api/telegram/report", "POST"],
                  ["AI Tutor", "/api/ai/tutor", "POST"],
                  ["AI Plan", "/api/ai/study-plan", "POST"],
                ].map(([mod, ep, m], i) => (
                  <tr key={i}><td style={{fontWeight:600}}>{mod}</td><td><code style={{fontSize:11}}>{ep}</code></td><td><span className="badge info">{m}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

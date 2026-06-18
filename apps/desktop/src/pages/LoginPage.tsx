import { useState } from "react";
import { updateConfig, getConfig, apiRequest } from "../hooks/useApi";
import BrandLogo from "../components/BrandLogo";

interface LoginPageProps {
  onLogin: () => void;
  theme: "dark" | "light";
}

export default function LoginPage({ onLogin, theme }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [endpoint, setEndpoint] = useState("https://aydim.com");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEndpoint, setShowEndpoint] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  const handleLogin = async (e: React.FormEvent, selectedTenantId?: string, selectedRole?: string) => {
    if (e) e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("E-posta ve şifre zorunludur");
      return;
    }

    setLoading(true);
    setError("");
    try {
      // 1. Önce endpoint'i kaydet (token olmadan)
      const currentConfig: any = await getConfig().catch(() => ({}));
      await updateConfig({
        api_endpoint: endpoint,
        api_token: "",
        watch_path: currentConfig.watch_path || "",
      });

      // 2. Sunucuya login isteğini Rust üzerinden gönder (CSP engellerini aşmak için)
      const data: any = await apiRequest("POST", "/api/auth/desktop", {
        email,
        password,
        tenantId: selectedTenantId || undefined,
        role: selectedRole || undefined,
      });

      // 3. Çoklu hesap seçimi gerekiyorsa
      if (data.requiresSelection) {
        setAccounts(data.accounts || []);
        setLoading(false);
        return;
      }

      // 4. Token'ı kaydet
      await updateConfig({
        api_endpoint: endpoint,
        api_token: data.token,
        watch_path: currentConfig.watch_path || "",
      });

      onLogin();
    } catch (err: any) {
      console.error("Login error:", err);
      let errMsg = "Sunucuya bağlanılamadı. Lütfen sunucu adresini kontrol edin.";
      if (typeof err === "string" && err.startsWith("HTTP ")) {
        const parts = err.split(":");
        if (parts.length >= 2) {
          const jsonStr = parts.slice(1).join(":").trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed && parsed.error) {
              errMsg = parsed.error;
            }
          } catch {
            errMsg = jsonStr || errMsg;
          }
        }
      } else if (err?.message) {
        errMsg = err.message;
      }
      setError(errMsg);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", width: "100vw", background: "var(--bg-dark)", transition: "background-color 0.3s ease" }}>
      <div className="card" style={{ width: 420, padding: 32 }}>
        <div className="text-center mb-4 flex-col items-center flex">
          <BrandLogo theme={theme} width={64} height={64} />
          <h1 style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, #818cf8, #c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 16 }}>
            Aydım
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>Masaüstü OMR Senkronizasyon Girişi</p>
        </div>

        {accounts.length > 0 ? (
          <div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
              E-postanıza bağlı birden fazla yetkili hesap bulundu. Lütfen giriş yapmak istediğiniz hesabı seçin:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "240px", overflowY: "auto", paddingRight: "4px" }}>
              {accounts.map((acc, i) => (
                <button
                  key={i}
                  type="button"
                  className="btn"
                  style={{
                    textAlign: "left",
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    background: "var(--bg-light, #1f2937)",
                    border: "1px solid var(--border, #374151)",
                    borderRadius: "6px",
                    cursor: "pointer",
                    transition: "border-color 0.2s"
                  }}
                  onClick={(e) => handleLogin(e, acc.tenantId, acc.role)}
                  disabled={loading}
                >
                  <strong style={{ display: "block", color: "var(--text-main, #ffffff)", fontSize: 13 }}>
                    {acc.tenantName || "Sistem Yöneticisi"}
                  </strong>
                  <span style={{ fontSize: 11, color: "var(--text-muted, #9ca3af)" }}>Rol: {acc.role}</span>
                </button>
              ))}
            </div>
            
            {error && (
              <div className="action-bar mb-4" style={{ color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)", fontSize: 13, marginTop: 16 }}>
                {error}
              </div>
            )}

            <button
              type="button"
              className="btn btn-ghost w-full"
              style={{ marginTop: 16, padding: "10px 14px" }}
              onClick={() => setAccounts([])}
              disabled={loading}
            >
              Geri Dön
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => handleLogin(e)}>
            <div className="form-group mb-4">
              <label className="form-label">E-posta Adresi</label>
              <input
                className="form-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@kurum.edu.tr"
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Şifre</label>
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            {/* Sunucu adresi — gelişmiş ayar olarak gizli */}
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={() => setShowEndpoint(!showEndpoint)}
                style={{
                  background: "none", border: "none", color: "var(--text-muted)",
                  fontSize: 12, cursor: "pointer", padding: 0, display: "flex",
                  alignItems: "center", gap: 4,
                }}
              >
                {showEndpoint ? "▼" : "▶"} Gelişmiş Ayarlar
              </button>
              {showEndpoint && (
                <div className="form-group" style={{ marginTop: 8 }}>
                  <label className="form-label" style={{ fontSize: 12 }}>Sunucu Adresi</label>
                  <input
                    className="form-input"
                    value={endpoint}
                    onChange={(e) => setEndpoint(e.target.value)}
                    placeholder="https://aydim.com"
                    style={{ fontSize: 12 }}
                  />
                </div>
              )}
            </div>

            {error && (
              <div className="action-bar mb-4" style={{ color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", borderColor: "rgba(239, 68, 68, 0.2)", fontSize: 13 }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full" disabled={loading} style={{ padding: "12px 16px", fontSize: 14 }}>
              {loading ? <><div className="spinner" /> Giriş yapılıyor...</> : "Giriş Yap"}
            </button>
          </form>
        )}

        <p style={{ color: "var(--text-muted)", fontSize: 11, textAlign: "center", marginTop: 16 }}>
          Web panelindeki hesap bilgilerinizi kullanarak giriş yapabilirsiniz.
          <br />Bu uygulama sadece yönetici hesaplarına açıktır.
        </p>
      </div>
    </div>
  );
}

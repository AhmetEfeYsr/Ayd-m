"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/contexts/AuthContext";

export default function FeedbackWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form State
  const [module, setModule] = useState("Öğrenci Paneli");
  const [part, setPart] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [description, setDescription] = useState("");
  const [email, setEmail] = useState("");

  // Update email once user is loaded
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!module || !part || !description) return;

    setLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module,
          part,
          errorCode,
          description,
          email,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setPart("");
        setErrorCode("");
        setDescription("");
        // Reset success message after 3 seconds and close modal
        setTimeout(() => {
          setSuccess(false);
          setIsOpen(false);
        }, 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Geri bildirim gönderilirken hata oluştu.");
      }
    } catch (err) {
      console.error(err);
      alert("Bir ağ hatası oluştu.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-lg border text-sm font-semibold transition-all hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
        style={{
          background: "var(--panel-bg)",
          borderColor: "var(--border-color)",
          color: "var(--text-primary)",
          boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.3)",
        }}
      >
        <span style={{ fontSize: "16px" }}>💬</span>
        <span>Destek & Hata Bildir</span>
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-all"
          onClick={() => {
            if (!loading && !success) setIsOpen(false);
          }}
        >
          {/* Modal Container */}
          <div
            className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl relative overflow-hidden transition-all scale-100"
            style={{
              background: "var(--bg-color)",
              borderColor: "var(--border-color)",
              color: "var(--text-primary)",
              boxShadow: "var(--glass-shadow)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">Hata ve Destek Bildirimi</h3>
                <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                  Karşılaştığınız sorunu bildirerek sistemi geliştirmemize yardımcı olabilirsiniz.
                </p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                disabled={loading || success}
                className="text-gray-400 hover:text-gray-200 transition-colors p-1 text-lg leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>

            {success ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-2xl font-bold"
                  style={{
                    background: "rgba(16, 185, 129, 0.15)",
                    color: "var(--success-color)",
                  }}
                >
                  ✓
                </div>
                <h4 className="text-lg font-medium">Teşekkür Ederiz!</h4>
                <p className="text-sm mt-1 px-4" style={{ color: "var(--text-secondary)" }}>
                  Geri bildiriminiz başarıyla kaydedildi. Gerekirse sizinle e-posta üzerinden iletişime geçeceğiz.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Module selection */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Hangi Modülde Sorun Yaşadınız? *
                  </label>
                  <select
                    value={module}
                    onChange={(e) => setModule(e.target.value)}
                    required
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-sm outline-none transition focus:border-blue-500 font-sans"
                    style={{ borderColor: "var(--border-color)" }}
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

                {/* Section/Part */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Hangi Kısım / Sayfa? *
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: Çalışma Planı, Sınav Sonuçları, Profil Ayarları"
                    value={part}
                    onChange={(e) => setPart(e.target.value)}
                    required
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                {/* Error Code (Optional) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Hata Kodu (Varsa - Opsiyonel)
                  </label>
                  <input
                    type="text"
                    placeholder="Örn: ERR_404, AUTH_NO_USER, vb."
                    value={errorCode}
                    onChange={(e) => setErrorCode(e.target.value)}
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    Sorunun Açıklaması *
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Lütfen hatayı veya şikayetinizi detaylıca açıklayın..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-sm outline-none transition focus:border-blue-500 resize-none"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                {/* Contact Email */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
                    İletişim E-postası (Opsiyonel)
                  </label>
                  <input
                    type="email"
                    placeholder="iletisim@örnek.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/30 border rounded-lg px-3 py-2 text-sm outline-none transition focus:border-blue-500"
                    style={{ borderColor: "var(--border-color)", color: "var(--text-primary)" }}
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={loading}
                    className="px-4 py-2 rounded-lg text-sm transition hover:bg-white/5 disabled:opacity-50 cursor-pointer"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-5 py-2 rounded-lg text-sm font-semibold transition active:scale-95 disabled:opacity-50 cursor-pointer"
                    style={{
                      background: "#3b82f6",
                      color: "white",
                    }}
                  >
                    {loading ? "Gönderiliyor..." : "Gönder"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

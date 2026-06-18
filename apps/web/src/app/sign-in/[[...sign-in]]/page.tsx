"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  // Çoklu hesap durumları
  const [accounts, setAccounts] = useState<any[]>([]);
  const [showSelection, setShowSelection] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "STUDENT") {
        router.push("/student");
      } else if (["TEACHER", "COACH", "INSTITUTION_ADMIN", "PUBLISHER", "SYSTEM_ADMIN"].includes(user.role)) {
        router.push("/admin");
      } else {
        router.push(redirect);
      }
    }
  }, [user, router, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Lütfen e-posta ve şifrenizi girin.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. E-posta ile kayıtlı olan hesapları sorgula
      const lookupRes = await fetch(`/api/auth/lookup?email=${encodeURIComponent(email)}`);
      const lookupData = await lookupRes.json();
      
      if (!lookupRes.ok) {
        throw new Error(lookupData.error || "Hesap kontrolü başarısız.");
      }

      if (!lookupData.accounts || lookupData.accounts.length === 0) {
        setError("Bu e-posta adresiyle kayıtlı aktif bir hesap bulunamadı.");
        setLoading(false);
        return;
      }

      // 2. Hesap sayısına göre dallan
      if (lookupData.accounts.length === 1) {
        // Tek bir hesap var, önekli e-posta ile giriş yap
        await signInWithEmailAndPassword(auth, lookupData.accounts[0].firebaseEmail, password);
      } else {
        // Birden fazla hesap var, kullanıcıya seçtir
        setAccounts(lookupData.accounts);
        setShowSelection(true);
        setLoading(false);
      }
    } catch (err: any) {
      console.error("Giriş hatası:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("E-posta adresi veya şifre hatalı.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Çok fazla başarısız deneme yapıldı. Lütfen daha sonra tekrar deneyin.");
      } else {
        setError(err.message || "Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      }
      setLoading(false);
    }
  };

  const handleSelectAccount = async (account: any) => {
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, account.firebaseEmail, password);
    } catch (err: any) {
      console.error("Giriş hatası:", err);
      if (err.code === "auth/invalid-credential" || err.code === "auth/user-not-found" || err.code === "auth/wrong-password") {
        setError("E-posta adresi veya şifre hatalı.");
      } else {
        setError("Giriş başarısız oldu. Lütfen tekrar deneyin.");
      }
      setLoading(false);
      setShowSelection(false);
    }
  };

  return (
    <main 
      className="auth-page" 
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        width: "100vw",
        background: "var(--bg-color, #09090b)",
        padding: 24,
      }}
    >
      <div 
        className="card" 
        style={{
          width: "100%",
          maxWidth: 420,
          padding: 40,
          background: "var(--panel-bg, rgba(24, 24, 27, 0.6))",
          border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
          borderRadius: 24,
          boxShadow: "var(--glass-shadow, 0 10px 30px rgba(0, 0, 0, 0.5))",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <BrandLogo width={48} height={48} />
          <h1 
            style={{ 
              fontSize: 24, 
              fontWeight: 700, 
              background: "linear-gradient(135deg, #60a5fa, #a78bfa)", 
              WebkitBackgroundClip: "text", 
              WebkitTextFillColor: "transparent",
            }}
          >
            Aydım
          </h1>
          <p style={{ color: "var(--text-secondary, #a1a1aa)", fontSize: 14 }}>
            {showSelection ? "Giriş Yapılacak Hesabı Seçin" : "Hesabınıza giriş yapın"}
          </p>
        </div>

        {showSelection ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <p style={{ color: "var(--text-secondary, #a1a1aa)", fontSize: 13, textAlign: "center", marginBottom: 8 }}>
              Bu e-posta adresiyle ilişkili birden fazla hesabınız bulunmaktadır. Lütfen giriş yapmak istediğiniz hesabı seçin:
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 250, overflowY: "auto", paddingRight: 4 }}>
              {accounts.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => handleSelectAccount(acc)}
                  className="admin-btn-primary"
                  style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.08))",
                    color: "var(--text-color, #f4f4f5)",
                    textAlign: "left",
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{acc.tenantName}</div>
                    <div style={{ fontSize: 12, color: "#a1a1aa", marginTop: 4 }}>
                      {acc.role === "STUDENT" ? "Öğrenci" : acc.role === "TEACHER" ? "Öğretmen" : acc.role === "INSTITUTION_ADMIN" ? "Kurum Yöneticisi" : acc.role}
                    </div>
                  </div>
                  <span style={{ color: "#60a5fa", fontSize: 13, fontWeight: 500 }}>Giriş Yap →</span>
                </button>
              ))}
            </div>
            
            {error && (
              <div 
                style={{ 
                  color: "#ef4444", 
                  background: "rgba(239, 68, 68, 0.08)", 
                  border: "1px solid rgba(239, 68, 68, 0.15)", 
                  padding: "12px 16px", 
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button
              type="button"
              disabled={loading}
              onClick={() => { setShowSelection(false); setError(""); }}
              style={{
                background: "none",
                border: "none",
                color: "#6b7280",
                fontSize: 13,
                cursor: "pointer",
                textAlign: "center",
                marginTop: 8,
                textDecoration: "underline",
              }}
            >
              ← Başka Bir E-posta ile Dene
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                E-posta Adresi
              </label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@kurum.com"
                required
                className="admin-input"
                style={{ width: "100%", padding: "12px 16px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                Şifre
              </label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="admin-input"
                style={{ width: "100%", padding: "12px 16px" }}
              />
            </div>

            {error && (
              <div 
                style={{ 
                  color: "#ef4444", 
                  background: "rgba(239, 68, 68, 0.08)", 
                  border: "1px solid rgba(239, 68, 68, 0.15)", 
                  padding: "12px 16px", 
                  borderRadius: 10,
                  fontSize: 13,
                }}
              >
                ⚠️ {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="admin-btn-primary"
              style={{ 
                width: "100%", 
                padding: "12px 16px", 
                fontSize: 15, 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  Giriş Yapılıyor...
                </>
              ) : (
                "Giriş Yap"
              )}
            </button>
          </form>
        )}

        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary, #a1a1aa)" }}>
          Hesabınız yok mu?{" "}
          <Link href="/sign-up" style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
            Kayıt Olun
          </Link>
        </div>
      </div>
    </main>
  );
}

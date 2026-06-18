"use client";

import React, { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function InstitutionSignUpPage() {
  const router = useRouter();
  const { user, syncSession } = useAuth();

  // Form states
  const [tenantName, setTenantName] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI States
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.role === "STUDENT") {
        router.push("/student");
      } else if (["TEACHER", "COACH", "INSTITUTION_ADMIN", "PUBLISHER", "SYSTEM_ADMIN"].includes(user.role)) {
        router.push("/admin");
      } else {
        router.push("/");
      }
    }
  }, [user, router]);

  // Quota status states
  const [statusLoading, setStatusLoading] = useState(true);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [limitMessage, setLimitMessage] = useState("");

  // Check quota status on mount
  useEffect(() => {
    async function checkQuotaStatus() {
      try {
        const res = await fetch("/api/auth/register-institution");
        if (res.ok) {
          const data = await res.json();
          if (data.isLimitReached) {
            setIsLimitReached(true);
            if (data.isInstitutionLimitReached && data.isStudentLimitReached) {
              setLimitMessage("Demo sürümü için maksimum 30 dershane ve sistem geneli 30.000 öğrenci limitine ulaşılmıştır.");
            } else if (data.isInstitutionLimitReached) {
              setLimitMessage("Demo sürümü için maksimum 30 dershane limitine ulaşılmıştır.");
            } else {
              setLimitMessage("Demo sürümü için sistem geneli 30.000 öğrenci limitine ulaşılmıştır.");
            }
          }
        }
      } catch (err) {
        console.error("Quota check failed:", err);
      } finally {
        setStatusLoading(false);
      }
    }
    checkQuotaStatus();
  }, []);

  // Submit Registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantName || !firstName || !lastName || !email || !password) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }
    if (password.length < 6) {
      setError("Şifreniz en az 6 karakter olmalıdır.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // 1. Submit and register on database
      const registerRes = await fetch("/api/auth/register-institution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantName,
          firstName,
          lastName,
          email,
          password,
        }),
      });

      const registerData = await registerRes.json();

      if (!registerRes.ok) {
        throw new Error(registerData.error || "Kayıt işlemi başarısız.");
      }

      const { firebaseEmail } = registerData;

      // 2. Sign in client-side using Firebase Auth with the prefixed email
      const userCredential = await signInWithEmailAndPassword(auth, firebaseEmail, password);
      
      // 3. Sync cookie-based session
      await syncSession(userCredential.user);

    } catch (err: any) {
      console.error("Institution signup error:", err);
      setError(err.message || "Bir hata oluştu. Lütfen bilgilerinizi kontrol edip tekrar deneyin.");
      setLoading(false);
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
        background: "radial-gradient(circle at center, #1e1b4b 0%, #09090b 100%)",
        padding: 24,
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: 500,
          padding: "36px 40px",
          background: "rgba(24, 24, 27, 0.7)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
          backdropFilter: "blur(20px)",
          display: "flex",
          flexDirection: "column",
          gap: 24,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
          <BrandLogo width={48} height={48} />
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Aydım Kurumsal Kayıt (Demo)
          </h1>
          <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.5 }}>
            Ücretsiz demo süresince toplam <strong>30 dershane</strong> kaydı alınacaktır.<br />
            Sistem geneli toplam öğrenci limiti <strong>30.000'dir</strong>.
          </p>
        </div>

        {/* Demo Notice Badge */}
        <div 
          style={{
            background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(96, 165, 250, 0.1))",
            border: "1px solid rgba(99, 102, 241, 0.2)",
            borderRadius: 16,
            padding: 16,
            fontSize: 13,
            color: "#e2e8f0",
            lineHeight: 1.5
          }}
        >
          🎁 <strong>Ücretsiz Deneyim:</strong> Uygulama içi satın alma veya kredi kartı gerekmez. SMS ve WhatsApp bildirimlerinizi kendi API anahtarlarınız veya Netgsm hesabınızla ücretsiz bağlayabilirsiniz.
        </div>

        {/* Signup Form or Quota Warning */}
        {statusLoading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
            <span style={{
              width: 32,
              height: 32,
              border: "3px solid rgba(99, 102, 241, 0.2)",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 1s linear infinite"
            }} />
          </div>
        ) : isLimitReached ? (
          <div 
            style={{
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: 16,
              padding: 24,
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16
            }}
          >
            <span style={{ fontSize: 40 }}>⚠️</span>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "#ef4444" }}>Demo Kontenjanı Dolmuştur</h3>
            <p style={{ fontSize: 14, color: "#a1a1aa", lineHeight: 1.5 }}>
              {limitMessage || "Demo sürümü limitlerine ulaşılmıştır."} Yeni dershane kaydı geçici olarak durdurulmuştur.
            </p>
            <Link
              href="/"
              className="admin-btn-primary btn-glow"
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: 10,
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 600,
                background: "#6366f1",
                color: "#fafafa",
              }}
            >
              Ana Sayfaya Dön
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
                Eğitim Kurumu / Dershane Adı
              </label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="Örn: Bilim Butik Dershanesi"
                required
                className="admin-input"
                style={{ width: "100%", padding: "12px 16px" }}
              />
            </div>

            <div style={{ display: "flex", gap: 16 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
                  Yönetici Adı
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Ahmet"
                  required
                  className="admin-input"
                  style={{ width: "100%", padding: "12px 16px" }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
                  Yönetici Soyadı
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Korkmaz"
                  required
                  className="admin-input"
                  style={{ width: "100%", padding: "12px 16px" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
                Kurumsal E-posta Adresi
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="yonetici@bilimdershanesi.com"
                required
                className="admin-input"
                style={{ width: "100%", padding: "12px 16px" }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: "#a1a1aa" }}>
                Yönetici Şifresi (En az 6 karakter)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
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
              className="admin-btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                marginTop: 8,
              }}
            >
              {loading ? "Kaydolunuyor..." : "Ücretsiz Kayıt Ol"}
            </button>
          </form>
        )}

        {/* Footer Link */}
        <div style={{ textAlign: "center", fontSize: 13, color: "#a1a1aa" }}>
          Zaten hesabınız var mı?{" "}
          <Link href="/sign-in" style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
            Giriş Yapın
          </Link>
        </div>
      </div>
    </main>
  );
}

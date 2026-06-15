"use client";

import React, { useState, useEffect } from "react";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

export default function SignUpPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, syncSession } = useAuth();
  const router = useRouter();

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !firstName || !lastName) {
      setError("Lütfen tüm alanları doldurun.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { getFirebaseEmail } = await import("@/lib/auth-helpers");
      const firebaseEmail = getFirebaseEmail(email, null, "STUDENT");

      // 1. Firebase Auth ile kayıt oluştur
      const userCredential = await createUserWithEmailAndPassword(auth, firebaseEmail, password);
      const firebaseUser = userCredential.user;

      // 2. Veritabanına öğrenci olarak kaydet
      const idToken = await firebaseUser.getIdToken();
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, firstName, lastName }),
      });

      if (!registerRes.ok) {
        const regData = await registerRes.json();
        throw new Error(regData.error || "Veritabanı kayıt işlemi başarısız.");
      }

      // 3. Oturumu senkronize et (çerezi set et)
      await syncSession(firebaseUser);
    } catch (err: any) {
      console.error("Kayıt hatası:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("Bu e-posta adresi zaten kullanımda.");
      } else if (err.code === "auth/weak-password") {
        setError("Şifre en az 6 karakter olmalıdır.");
      } else if (err.code === "auth/invalid-email") {
        setError("Geçersiz bir e-posta adresi girdiniz.");
      } else {
        setError(err.message || "Kayıt olurken bir hata oluştu. Lütfen tekrar deneyin.");
      }
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
        background: "var(--bg-color, #09090b)",
        padding: 24,
      }}
    >
      <div 
        className="card" 
        style={{
          width: "100%",
          maxWidth: 440,
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
            Sedusis
          </h1>
          <p style={{ color: "var(--text-secondary, #a1a1aa)", fontSize: 14 }}>
            Öğrenci Hesabı Oluşturun
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                Ad
              </label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ahmet"
                required
                className="admin-input"
                style={{ width: "100%", padding: "10px 14px" }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
              <label style={{ fontSize: 13, fontWeight: 500, color: "var(--text-secondary, #a1a1aa)" }}>
                Soyad
              </label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Yılmaz"
                required
                className="admin-input"
                style={{ width: "100%", padding: "10px 14px" }}
              />
            </div>
          </div>

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
              style={{ width: "100%", padding: "10px 14px" }}
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
              style={{ width: "100%", padding: "10px 14px" }}
            />
          </div>

          {error && (
            <div 
              style={{ 
                color: "#ef4444", 
                background: "rgba(239, 68, 68, 0.08)", 
                border: "1px solid rgba(239, 68, 68, 0.15)", 
                padding: "10px 14px", 
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
              marginTop: 8,
            }}
          >
            {loading ? (
              <>
                <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                Hesap Oluşturuluyor...
              </>
            ) : (
              "Kayıt Ol"
            )}
          </button>
        </form>

        <div style={{ textAlign: "center", fontSize: 13, color: "var(--text-secondary, #a1a1aa)" }}>
          Zaten hesabınız var mı?{" "}
          <Link href="/sign-in" style={{ color: "#60a5fa", textDecoration: "none", fontWeight: 500 }}>
            Giriş Yapın
          </Link>
        </div>
      </div>
    </main>
  );
}

import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ücretsiz Demo | Aydım Eğitim Kurumu Yönetim Platformu",
  description: "Aydım platformumuz üretim öncesi demo sürecindedir. Sınırlı kontenjanla tamamen ücretsiz kayıt olabilirsiniz.",
  keywords: "aydım ücretsiz, eğitim kurumu yazılımı ücretsiz, demo dershane yazılımı, aydım demo",
};

export default function PricingPage() {
  return (
    <main 
      style={{
        background: "radial-gradient(ellipse at top, #1e1b4b, #09090b)",
        color: "#f4f4f5",
        minHeight: "100vh",
        padding: "80px 24px",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Header Section */}
      <section style={{ maxWidth: 900, margin: "0 auto 40px", textAlign: "center" }}>
        <span 
          style={{
            background: "rgba(99, 102, 241, 0.2)",
            color: "#818cf8",
            padding: "6px 16px",
            borderRadius: 99,
            fontSize: 13,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            border: "1px solid rgba(99, 102, 241, 0.3)",
            display: "inline-block",
            marginBottom: 20
          }}
        >
          🚀 ÜRETİM ÖNCESİ DEMO AŞAMASI
        </span>
        
        <h1 
          id="pricing-title"
          style={{ 
            fontSize: "clamp(2.2rem, 4vw, 3.2rem)", 
            fontWeight: 800, 
            background: "linear-gradient(135deg, #a78bfa, #60a5fa)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent",
            marginBottom: 20,
            letterSpacing: "-0.02em",
          }}
        >
          İlk 30 Dershaneye Özel Ücretsiz Demo Kampanyası
        </h1>
        <p 
          style={{ 
            fontSize: "clamp(1.1rem, 2vw, 1.25rem)", 
            color: "#a1a1aa", 
            lineHeight: 1.6, 
            maxWidth: 700, 
            margin: "0 auto" 
          }}
        >
          Aydım Eğitim Kurumu Yönetim Platformu üretim hazırlık aşamasında olup, lansman öncesinde 
          ilk <strong>30 dershaneye</strong> sistem genelinde toplam <strong>30.000 öğrenciye kadar</strong> tamamen ücretsiz sunulmaktadır.
        </p>
      </section>

      {/* Main Info Card */}
      <section 
        style={{ 
          maxWidth: 700, 
          width: "100%",
          background: "rgba(24, 24, 27, 0.4)", 
          border: "1px solid rgba(255, 255, 255, 0.08)", 
          padding: "40px", 
          borderRadius: 24,
          backdropFilter: "blur(12px)",
          marginBottom: 60,
          textAlign: "center",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)"
        }}
      >
        <div style={{ fontSize: 44, marginBottom: 16 }}>🎁</div>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>Kontenjan Sınırlı Üyelik</h2>
        <p style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
          Üretim hazırlık sürecinde sistem stabilitesini test etmek amacıyla kayıt limiti getirilmiştir:
        </p>

        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: 16, 
            marginBottom: 32,
            textAlign: "left"
          }}
        >
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: 20, borderRadius: 16 }}>
            <span style={{ fontSize: 12, color: "#a1a1aa", display: "block", marginBottom: 4 }}>Dershane Limiti</span>
            <strong style={{ fontSize: 20, color: "#a78bfa" }}>Maks. 30 Kayıt</strong>
          </div>
          <div style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", padding: 20, borderRadius: 16 }}>
            <span style={{ fontSize: 12, color: "#a1a1aa", display: "block", marginBottom: 4 }}>Öğrenci Limiti</span>
            <strong style={{ fontSize: 20, color: "#60a5fa" }}>Sistem Geneli 30.000 Öğrenci</strong>
          </div>
        </div>

        <Link
          href="/sign-up/institution"
          style={{
            display: "inline-block",
            background: "#6366f1",
            color: "#fff",
            padding: "16px 32px",
            borderRadius: 12,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
          }}
        >
          Ücretsiz Demo Hesabı Oluştur
        </Link>
      </section>

      {/* Feature Plan Grid */}
      <section style={{ maxWidth: 1000, margin: "0 auto 60px", width: "100%" }}>
        <h3 
          style={{ 
            fontSize: 22, 
            fontWeight: 700, 
            textAlign: "center", 
            marginBottom: 32,
            color: "#fafafa"
          }}
        >
          Tüm Platform Altyapısı ve Özellikleri Dahil
        </h3>
        
        <div 
          style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
            gap: 24 
          }}
        >
          <div 
            style={{ 
              background: "rgba(24, 24, 27, 0.4)", 
              border: "1px solid rgba(255, 255, 255, 0.05)", 
              padding: 24, 
              borderRadius: 20,
              backdropFilter: "blur(12px)"
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📊</div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#c084fc", marginBottom: 8 }}>Tauri OMR Entegrasyonu</h4>
            <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.6 }}>
              Masaüstü optik okuma yazılımı ve anlık bulut senkronizasyonu demo süresince tamamen ücretsizdir.
            </p>
          </div>

          <div 
            style={{ 
              background: "rgba(24, 24, 27, 0.4)", 
              border: "1px solid rgba(255, 255, 255, 0.05)", 
              padding: 24, 
              borderRadius: 20,
              backdropFilter: "blur(12px)"
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>👥</div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#60a5fa", marginBottom: 8 }}>Yoklama & Program Yönetimi</h4>
            <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.6 }}>
              Derslik, öğretmen ve şube tanımlaması. Anlık yoklama durumları ve veli mobil arayüz erişimi.
            </p>
          </div>

          <div 
            style={{ 
              background: "rgba(24, 24, 27, 0.4)", 
              border: "1px solid rgba(255, 255, 255, 0.05)", 
              padding: 24, 
              borderRadius: 20,
              backdropFilter: "blur(12px)"
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>🤖</div>
            <h4 style={{ fontSize: 16, fontWeight: 600, color: "#34d399", marginBottom: 8 }}>Yapay Zeka Eğitim Rehberi</h4>
            <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.6 }}>
              Öğrencilerin konu eksiklerini analiz eden ve ZK-güvenlik standartlarıyla çalışan yapay zeka asistanı.
            </p>
          </div>
        </div>
      </section>

      {/* API Disclaimer */}
      <section 
        style={{ 
          maxWidth: 800, 
          margin: "0 auto", 
          padding: 30, 
          background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(59, 130, 246, 0.05))",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: 24,
          textAlign: "center"
        }}
      >
        <h3 style={{ fontSize: 18, fontWeight: 600, color: "#f4f4f5", marginBottom: 12 }}>
          Kendi İletişim Altyapınızı Kullanın
        </h3>
        <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
          Uygulama içi satın alma veya ekstra ödeme yoktur. Velilere göndereceğiniz 
          <strong> SMS ve WhatsApp bildirimleri</strong> için kendi Netgsm hesap bilgilerinizi ya da dış API anahtarlarınızı panelden kolayca bağlayıp kullanabilirsiniz.
        </p>
      </section>
    </main>
  );
}

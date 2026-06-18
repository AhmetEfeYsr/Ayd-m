"use client";

import React, { useState } from "react";
import Link from "next/link";
import BrandLogo from "@/components/BrandLogo";

interface LandingClientPageProps {
  user: {
    id: string;
    email: string;
    role: string;
    tenantId: string | null;
  } | null;
}

export default function LandingClientPage({ user }: LandingClientPageProps) {
  // Mobile menu toggle
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Contact form state
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactLoading, setContactLoading] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail || !contactMessage || !contactName) {
      setContactError("Lütfen ad, e-posta ve mesaj alanlarını doldurun.");
      return;
    }

    setContactLoading(true);
    setContactError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: contactEmail,
          module: "LANDING_PAGE",
          part: "CONTACT_FORM",
          description: `Gönderen: ${contactName}\nKonu: ${contactSubject || "Genel Bilgi Talebi"}\n\nMesaj:\n${contactMessage}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Mesajınız iletilemedi. Lütfen daha sonra tekrar deneyin.");
      }

      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    } catch (err: any) {
      setContactError(err.message || "Bir hata oluştu.");
    } finally {
      setContactLoading(false);
    }
  };

  // FAQ accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Chat simulator state
  const [chatMessages, setChatMessages] = useState<Array<{ sender: "ai" | "user"; text: string }>>([
    { sender: "ai", text: "Merhaba! Ben Aydım Yapay Zeka Rehberlik Asistanı. Kurumunuzdaki öğrencilerin gelişim süreçleri, konu eksikleri ve haftalık ders çalışma hedefleri hakkında yardımcı olabilirim. Nasıl başlayabiliriz?" }
  ]);
  const [isTyping, setIsTyping] = useState(false);

  const handleSimulationSelect = (question: string) => {
    if (isTyping) return;
    setChatMessages(prev => [...prev, { sender: "user", text: question }]);
    setIsTyping(true);
    
    setTimeout(() => {
      let answer = "";
      if (question.includes("Yapay Zeka")) {
        answer = "Aydım AI, öğrencilerin deneme sınavı sonuçlarındaki konu yanlışlarını MEB kazanım grafiğine göre saniyeler içinde analiz eder. Hangi dersten hangi konuya çalışması gerektiğini belirleyip kişiye özel haftalık çalışma planları oluşturur ve hedefler atar.";
      } else if (question.includes("Tauri")) {
        answer = "Tauri masaüstü OMR yazılımımız, yerel tarayıcınızdan (scanner) gelen YKS deneme optik formlarını doğrudan bilgisayarınızda okur. İnternet kesilse dahi SQLite önbelleği sayesinde verileri korur ve bağlantı geldiğinde buluta senkronize eder.";
      } else {
        answer = "Öğrenciler dershaneye giriş yapmadığında veya deneme sınavına katılmadığında, sistem anlık olarak yoklama eksikliğini tespit eder ve Netgsm API'niz üzerinden velilere otomatik SMS gönderir veya WhatsApp Cloud API üzerinden şablon bildirimler iletir.";
      }
      setChatMessages(prev => [...prev, { sender: "ai", text: answer }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div
      style={{
        background: "radial-gradient(ellipse at top, #1e1b4b, #09090b)",
        color: "#f4f4f5",
        minHeight: "100vh",
        fontFamily: "'Outfit', 'Inter', sans-serif",
        overflowX: "hidden",
        width: "100vw",
      }}
    >
      {/* Dynamic Glow effects */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "25vw",
          width: "50vw",
          height: "450px",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, rgba(0,0,0,0) 70%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "1200px",
          right: "5vw",
          width: "40vw",
          height: "500px",
          background: "radial-gradient(circle, rgba(167, 139, 250, 0.08) 0%, rgba(0,0,0,0) 70%)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Embedded CSS for Premium Styling */}
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }
        .landing-nav-link {
          color: #a1a1aa;
          text-decoration: none;
          font-weight: 500;
          font-size: 14px;
          transition: color 0.2s ease;
          position: relative;
        }
        .landing-nav-link:hover {
          color: #fafafa;
        }
        .landing-nav-link::after {
          content: '';
          position: absolute;
          width: 0;
          height: 2px;
          bottom: -4px;
          left: 0;
          background-color: #6366f1;
          transition: width 0.2s ease;
        }
        .landing-nav-link:hover::after {
          width: 100%;
        }
        .feature-card {
          background: rgba(24, 24, 27, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 32px;
          border-radius: 24px;
          backdrop-filter: blur(12px);
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .feature-card:hover {
          transform: translateY(-8px);
          border-color: rgba(99, 102, 241, 0.3);
          box-shadow: 0 20px 40px rgba(99, 102, 241, 0.08);
        }
        .pricing-card {
          background: rgba(24, 24, 27, 0.55);
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 40px 32px;
          border-radius: 28px;
          backdrop-filter: blur(12px);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .pricing-card.popular {
          border-color: rgba(99, 102, 241, 0.6);
          background: rgba(30, 27, 75, 0.4);
          box-shadow: 0 15px 35px rgba(99, 102, 241, 0.1);
        }
        .pricing-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
        }
        .pricing-card.popular:hover {
          box-shadow: 0 25px 50px rgba(99, 102, 241, 0.18);
        }
        .btn-glow {
          position: relative;
          overflow: hidden;
        }
        .btn-glow::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, transparent, rgba(255,255,255,0.15), transparent);
          transform: rotate(45deg);
          transition: transform 0.5s ease;
        }
        .btn-glow:hover::after {
          transform: translate(50%, 50%) rotate(45deg);
        }
        .faq-accordion-header h4 {
          margin: 0;
          font-size: 16px;
        }
        .admin-input:focus {
          border-color: #6366f1;
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
          outline: none;
        }
        @media (max-width: 768px) {
          .desktop-only {
            display: none !important;
          }
          .mobile-menu-btn {
            display: block !important;
          }
        }
      `}} />

      {/* Header / Navbar */}
      <header className="glass-nav" style={{ padding: "16px 24px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <BrandLogo width={36} height={36} />
            <span
              style={{
                fontSize: 22,
                fontWeight: 800,
                background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              Aydım
            </span>
          </Link>

          {/* Desktop Nav Links */}
          <nav style={{ display: "flex", alignItems: "center", gap: 32 }} className="desktop-only">
            <a href="#features" className="landing-nav-link">Özellikler</a>
            <a href="#ai-preview" className="landing-nav-link">Yapay Zeka Rehberi</a>
            <a href="#about" className="landing-nav-link">Hakkımızda</a>
            <a href="#pricing" className="landing-nav-link">Ücretsiz Demo</a>
            <a href="#faq" className="landing-nav-link">S.S.S</a>
            <a href="#contact" className="landing-nav-link">İletişim</a>
          </nav>

          {/* CTA Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {user ? (
              <Link
                href={["TEACHER", "COACH", "INSTITUTION_ADMIN", "PUBLISHER", "SYSTEM_ADMIN"].includes(user.role) ? "/admin" : "/student"}
                className="admin-btn-primary btn-glow"
                style={{ textDecoration: "none", fontSize: 13, padding: "10px 18px", borderRadius: 10, background: "#6366f1" }}
              >
                Yönetim Paneli →
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  style={{
                    color: "#f4f4f5",
                    textDecoration: "none",
                    fontWeight: 600,
                    fontSize: 13,
                    padding: "10px 16px",
                  }}
                >
                  Giriş Yap
                </Link>
                <Link
                  href="/sign-up/institution"
                  className="admin-btn-primary btn-glow"
                  style={{
                    textDecoration: "none",
                    fontSize: 13,
                    padding: "10px 18px",
                    borderRadius: 10,
                    background: "#6366f1",
                    boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
                  }}
                >
                  Ücretsiz Kaydol (Demo)
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "140px 24px 80px",
          textAlign: "center",
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24,
        }}
        className="animate-fadeup"
      >
        <span
          style={{
            background: "rgba(99, 102, 241, 0.1)",
            color: "#a5b4fc",
            padding: "6px 16px",
            borderRadius: 99,
            fontSize: 12,
            fontWeight: 600,
            border: "1px solid rgba(99, 102, 241, 0.25)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          ⚡ Yapay Zeka Destekli Kurumsal Eğitim Yönetimi (Demo Sürümü)
        </span>
        
        <h1
          style={{
            fontSize: "clamp(2.5rem, 5.5vw, 4.2rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            letterSpacing: "-0.03em",
            maxWidth: 1000,
            background: "linear-gradient(135deg, #fafafa 30%, #a1a1aa 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Kurumunuzu Akıllı Bulut ve Yapay Zeka Altyapısıyla Geleceğe Taşıyın
        </h1>

        <p
          style={{
            fontSize: "clamp(1.1rem, 2vw, 1.25rem)",
            color: "#a1a1aa",
            lineHeight: 1.6,
            maxWidth: 780,
            fontWeight: 400,
          }}
        >
          Yerel Tauri OMR optik okuyucu entegrasyonu, yapay zeka destekli konu eksik analizi, kişiye özel ders çalışma planlaması ve velilere WhatsApp/SMS yoklama bildirimleri tek bir kusursuz platformda.
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 16, marginTop: 16, zIndex: 20 }}>
          <Link
            href="/sign-up/institution"
            className="admin-btn-primary btn-glow"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 12,
              textDecoration: "none",
              background: "#6366f1",
              boxShadow: "0 10px 25px rgba(99, 102, 241, 0.3)",
              fontWeight: 700,
            }}
          >
            Ücretsiz Demo Hesabı Oluştur
          </Link>
          <a
            href="#features"
            style={{
              padding: "16px 32px",
              fontSize: 16,
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.12)",
              background: "rgba(255, 255, 255, 0.03)",
              color: "#fafafa",
              textDecoration: "none",
              fontWeight: 600,
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)"; }}
          >
            Özellikleri İncele
          </a>
        </div>

        {/* Tech Stack Integrations */}
        <div style={{ marginTop: 60, width: "100%" }}>
          <p style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em", color: "#71717a", fontWeight: 600 }}>Tam Uyumlu Entegre Teknolojiler</p>
          <div className="tech-badge-container">
            <div className="tech-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
              <span>Tauri OMR (Masaüstü)</span>
            </div>
            <div className="tech-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>SQLite Yerel Depolama</span>
            </div>
            <div className="tech-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>Netgsm SMS Entegrasyonu</span>
            </div>
            <div className="tech-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              <span>WhatsApp Cloud API</span>
            </div>
            <div className="tech-badge">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>Gemini AI Analitik</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2
            style={{
              fontSize: 38,
              fontWeight: 800,
              background: "linear-gradient(135deg, #f4f4f5, #a1a1aa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            Kurumunuz İçin Uçtan Uca Çözümler
          </h2>
          <p style={{ color: "#a1a1aa", fontSize: 16, maxWidth: 600, margin: "0 auto", lineHeight: 1.6 }}>
            Öğrenci başarısını artırmak, operasyonel yükleri sıfıra indirmek ve veli ilişkilerini güçlendirmek için tasarlandı.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 28 }}>
          
          <div className="feature-card">
            <div style={{ color: "#60a5fa", marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>Tauri OMR Optik Okuma</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
              Masaüstü optik okuyucu yazılımımız ile tüm standart sınav formlarını yerel tarayıcınızdan saniyeler içinde okutun. SQLite yerel önbelleği ve anlık bulut eşitleme ile sonuçlar anında veli ve öğrenci paneline yansır.
            </p>
          </div>

          <div className="feature-card">
            <div style={{ color: "#a78bfa", marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>Yapay Zeka Eğitim Rehberi</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
              Sınav sonuçlarındaki konu yanlışlarını analiz eden ve MEB kazanım grafiğini kullanarak öğrenciye özel yapay zeka tabanlı haftalık çalışma hedefleri ve RAG asistanlığı sağlayan güçlü zeka altyapısı.
            </p>
          </div>

          <div className="feature-card">
            <div style={{ color: "#34d399", marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>Anlık Veli Yoklama Uyarısı</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
              Ders saati veya sınav zamanı gelmesine rağmen yoklamada eksik görünen öğrencileri anında tespit edin. Entegre Netgsm SMS servisimiz veya WhatsApp Cloud API üzerinden velilere otomatik bildirimler gönderin.
            </p>
          </div>

          <div className="feature-card">
            <div style={{ color: "#f59e0b", marginBottom: 20 }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path><path d="M12 16V12"></path><path d="M12 8h.01"></path></svg>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 700, color: "#ffffff", marginBottom: 12 }}>Gelişmiş Kazanım Analizleri</h3>
            <p style={{ color: "#a1a1aa", fontSize: 14, lineHeight: 1.6 }}>
              Öğretmenler, rehber öğretmenler ve idareciler için öğrenci gelişim grafikleri, şube net ortalamaları, kazanım detayları ve konu performanslarını takip eden etkileşimli admin panelleri.
            </p>
          </div>
          
        </div>
      </section>

      {/* Interactive AI Preview Section */}
      <section id="ai-preview" style={{ maxWidth: 1000, margin: "0 auto", padding: "60px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Canlı Deneyim</span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fafafa", marginTop: 8, marginBottom: 12 }}>Rehberlik Asistanını Şimdi Deneyin</h2>
          <p style={{ color: "#a1a1aa", fontSize: 15, maxWidth: 600, margin: "0 auto" }}>
            Aşağıdaki hazır sorulardan birine tıklayarak Aydım AI asistanının gerçek zamanlı olarak nasıl yanıtlar verdiğini inceleyin.
          </p>
        </div>

        <div className="chat-window">
          <div className="chat-header">
            <div className="chat-avatar">🤖</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: "#fafafa" }}>Aydım AI Rehberlik Modülü</div>
              <div style={{ fontSize: 11, color: "#a1a1aa", display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <span className="chat-status-dot"></span> Çevrimiçi • Öğrenci Eksik Analiz Motoru
              </div>
            </div>
          </div>

          <div className="chat-messages">
            {chatMessages.map((msg, index) => (
              <div key={index} className={`chat-bubble ${msg.sender}`}>
                {msg.text}
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble ai" style={{ display: "flex", alignItems: "center" }}>
                <div className="chat-typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-area">
            <span style={{ fontSize: 12, color: "#71717a", width: "100%", marginBottom: 6, fontWeight: 600 }}>Cevap almak için bir soru seçin:</span>
            <button className="chat-suggestion" onClick={() => handleSimulationSelect("Yapay Zeka Rehberlik nasıl çalışır?")}>
              🤖 Yapay Zeka Rehberlik
            </button>
            <button className="chat-suggestion" onClick={() => handleSimulationSelect("Tauri OMR entegrasyonu nedir?")}>
              📊 Tauri OMR Okuyucu
            </button>
            <button className="chat-suggestion" onClick={() => handleSimulationSelect("Netgsm SMS ve veli yoklama nasıl tetiklenir?")}>
              💬 Veli Bildirimleri
            </button>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" style={{ background: "rgba(24, 24, 27, 0.3)", padding: "100px 24px", borderTop: "1px solid rgba(255, 255, 255, 0.03)", borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: 60, alignItems: "center" }}>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#c084fc", textTransform: "uppercase" }}>Biz Kimiz?</span>
            <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fafafa", lineHeight: 1.25 }}>Eğitim Teknolojilerinde Yeni Nesil Standart</h2>
            <p style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.6 }}>
              Aydım, eğitim kurumlarının operasyonel yüklerini tamamen azaltırken öğrencilerin sınav başarısını en üst düzen düzeyine çıkarmayı amaçlayan, bulut ve yapay zeka odaklı modern bir eğitim yönetim sistemidir.
            </p>
            <p style={{ color: "#a1a1aa", fontSize: 15, lineHeight: 1.6 }}>
              Zero-Knowledge (Sıfır Bilgi) şifreleme yöntemlerimiz sayesinde, öğrenci ve velilerinizin tüm verileri (KVKK uyumlu olarak) veritabanında uçtan uca şifreli olarak depolanır ve korunur. Yüksek güvenlikli ve hız sınırlandırmalı altyapımızla kesintisiz hizmet sunuyoruz.
            </p>
          </div>

          <div 
            style={{ 
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(167, 139, 250, 0.05))",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 24,
              padding: 40,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, background: "rgba(99, 102, 241, 0.15)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>🛡️</div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fafafa" }}>Sıfır Bilgi Şifreleme</h4>
                <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>Kişisel verileriniz ve sınav sonuçlarınız uçtan uca şifreli olarak depolanır.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, background: "rgba(52, 211, 153, 0.15)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>⚡</div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fafafa" }}>Anında Entegrasyon</h4>
                <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>Web tabanlı yapısı ve masaüstü OMR yazılımı ile hiçbir karmaşık kurulum gerektirmez.</p>
              </div>
            </div>

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
              <div style={{ fontSize: 24, background: "rgba(245, 158, 11, 0.15)", width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>📞</div>
              <div>
                <h4 style={{ fontSize: 16, fontWeight: 700, color: "#fafafa" }}>7/24 Kesintisiz Destek</h4>
                <p style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>Teknik ekibimiz kurulum ve entegrasyon adımlarında her an yanınızdadır.</p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Pricing Plans Section */}
      <section id="pricing" style={{ maxWidth: 1200, margin: "0 auto", padding: "100px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <span 
            style={{
              background: "rgba(99, 102, 241, 0.2)",
              color: "#818cf8",
              padding: "6px 16px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              border: "1px solid rgba(99, 102, 241, 0.3)",
              display: "inline-block",
              marginBottom: 16
            }}
          >
            🚀 ÜRETİM ÖNCESİ DEMO AŞAMASI
          </span>
          <h2
            style={{
              fontSize: 36,
              fontWeight: 800,
              background: "linear-gradient(135deg, #fafafa, #a1a1aa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 16,
              letterSpacing: "-0.02em",
            }}
          >
            İlk 30 Kuruma Özel Ücretsiz Demo
          </h2>
          <p style={{ color: "#a1a1aa", fontSize: 16, maxWidth: 650, margin: "0 auto", lineHeight: 1.6 }}>
            Aydım bulut altyapısıyla optik okuma, yapay zeka rehberliği, yoklama ve veli iletişim ağını lansman öncesi ücretsiz test edin. Sistem geneli limit 30.000 öğrencidir.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, maxWidth: 1000, margin: "0 auto" }}>
          
          {/* Box 1: Limits */}
          <div className="pricing-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>Aydım Kurumsal (Demo)</h3>
              <p style={{ color: "#a1a1aa", fontSize: 13, minHeight: 40 }}>Eğitim kurumu yönetiminde ihtiyacınız olan tüm temel ve gelişmiş modüller demo süresince tamamen ücretsiz.</p>
              
              <div style={{ margin: "24px 0" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#a78bfa" }}>Ücretsiz Demo</span>
                <div style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>İlk 30 kurum kontenjanı ile sınırlıdır</div>
              </div>
              
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 0, listStyle: "none", fontSize: 14, color: "#d4d4d8", marginBottom: 40 }}>
                <li>✔️ Maks. 30 kurum kapasitesi (Sınırlı Kontenjan)</li>
                <li>✔️ Sistem geneli toplam 30.000 öğrenci limiti</li>
                <li>✔️ Öğretmen, şube ve takvim yönetimi</li>
                <li>✔️ Tauri masaüstü OMR okuma yazılımı</li>
                <li>✔️ Yapay Zeka analiz destekli eksik tespiti</li>
              </ul>
            </div>
            
            <Link
              href="/sign-up/institution"
              className="admin-btn-primary btn-glow"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 700,
                background: "#6366f1",
                boxShadow: "0 4px 14px rgba(99, 102, 241, 0.4)",
              }}
            >
              Ücretsiz Demo Hesabı Oluştur
            </Link>
          </div>

          {/* Box 2: Custom API Configuration */}
          <div className="pricing-card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", position: "relative" }}>
            <div>
              <h3 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>Kendi Entegrasyonunuz</h3>
              <p style={{ color: "#a1a1aa", fontSize: 13, minHeight: 40 }}>Dış iletişim servislerinizi doğrudan bağlayın, ek komisyon ödemeyin.</p>
              
              <div style={{ margin: "24px 0" }}>
                <span style={{ fontSize: 36, fontWeight: 800, color: "#60a5fa" }}>Kendi API Key / Netgsm</span>
                <div style={{ fontSize: 13, color: "#a1a1aa", marginTop: 4 }}>Dış servis sağlayıcılar doğrudan panele bağlanır</div>
              </div>
              
              <ul style={{ display: "flex", flexDirection: "column", gap: 12, paddingLeft: 0, listStyle: "none", fontSize: 14, color: "#d4d4d8", marginBottom: 40 }}>
                <li>✔️ <strong>Netgsm Entegrasyonu:</strong> Kendi hesabınızla SMS gönderimi</li>
                <li>✔️ <strong>WhatsApp Business:</strong> Cloud API ile velilere bildirim</li>
                <li>✔️ Ekstra komisyon veya gizli ücretlendirme yoktur</li>
                <li>✔️ Kendi bütçenize göre iletişim limitlerini yönetin</li>
              </ul>
            </div>
            
            <Link
              href="/sign-up/institution"
              className="admin-btn-primary"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 10,
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 600,
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#fafafa",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255, 255, 255, 0.05)"; }}
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" style={{ maxWidth: 850, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#a78bfa", textTransform: "uppercase", letterSpacing: "0.08em" }}>Destek & Bilgi</span>
          <h2 style={{ fontSize: 32, fontWeight: 800, color: "#fafafa", marginTop: 8, marginBottom: 12 }}>Sıkça Sorulan Sorular</h2>
          <p style={{ color: "#a1a1aa", fontSize: 15 }}>
            Aydım platformu hakkında en çok merak edilen konuları derledik.
          </p>
        </div>

        <div>
          <div className="faq-accordion">
            <div className="faq-accordion-header" onClick={() => setOpenFaq(openFaq === 0 ? null : 0)}>
              <h4>1. Aydım Kurumsal Paket kurulum süreci ne kadar sürmektedir?</h4>
              <span className={`faq-arrow ${openFaq === 0 ? "open" : ""}`} style={{ fontSize: 18 }}>▼</span>
            </div>
            {openFaq === 0 && (
              <div className="faq-accordion-content">
                Aydım kurumsal yönetim sistemine geçiş süreci tamamen bulut tabanlı olduğu için anında başlar. Kurum kaydınızı yaptıktan sonra Tauri OMR masaüstü programını indirip bilgisayarınıza kurabilir ve yerel tarayıcınızla bağlayarak aynı gün içerisinde deneme sınavlarınızı okutmaya başlayabilirsiniz.
              </div>
            )}
          </div>

          <div className="faq-accordion">
            <div className="faq-accordion-header" onClick={() => setOpenFaq(openFaq === 1 ? null : 1)}>
              <h4>2. Tauri OMR optik okuma yazılımı nasıl çalışıyor?</h4>
              <span className={`faq-arrow ${openFaq === 1 ? "open" : ""}`} style={{ fontSize: 18 }}>▼</span>
            </div>
            {openFaq === 1 && (
              <div className="faq-accordion-content">
                Tauri tabanlı masaüstü yazılımımız bilgisayarınıza kurulur ve herhangi bir standart tarayıcıya (scanner) bağlanır. Sınav formlarını toplu olarak tarattığınızda yazılımımız bunları saniyeler içinde okur. Yerel SQLite veritabanı sayesinde internet kesilse bile okuma devam eder, internet geldiğinde otomatik olarak buluta eşitlenir.
              </div>
            )}
          </div>

          <div className="faq-accordion">
            <div className="faq-accordion-header" onClick={() => setOpenFaq(openFaq === 2 ? null : 2)}>
              <h4>3. WhatsApp ve Netgsm SMS gönderimleri için ek ücret ödeyecek miyim?</h4>
              <span className={`faq-arrow ${openFaq === 2 ? "open" : ""}`} style={{ fontSize: 18 }}>▼</span>
            </div>
            {openFaq === 2 && (
              <div className="faq-accordion-content">
                Hayır. Aydım, bildirim gönderimlerinden komisyon veya ek ücret almaz. Kurum yöneticisi paneli üzerinden kendi Netgsm kullanıcı bilgilerini veya WhatsApp Cloud API anahtarlarını sisteme bağlar. Gönderim maliyetleri doğrudan kendi operatör anlaşmanız üzerinden karşılanır.
              </div>
            )}
          </div>

          <div className="faq-accordion">
            <div className="faq-accordion-header" onClick={() => setOpenFaq(openFaq === 3 ? null : 3)}>
              <h4>4. Veri Güvenliği ve KVKK uyumluluğu nasıl sağlanıyor?</h4>
              <span className={`faq-arrow ${openFaq === 3 ? "open" : ""}`} style={{ fontSize: 18 }}>▼</span>
            </div>
            {openFaq === 3 && (
              <div className="faq-accordion-content">
                Aydım, sıfır bilgi (Zero-Knowledge) güvenlik prensiplerine göre çalışır. Öğrenci, veli ve öğretmenlerin hassas kişisel verileri veritabanında şifrelenmiş olarak saklanır. Sistem yöneticileri dahi sizin izniniz olmadan bu verilere erişemez. Tüm altyapı KVKK mevzuatına tam uyumludur.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" style={{ maxWidth: 850, margin: "0 auto", padding: "40px 24px 120px" }}>
        <div 
          style={{
            background: "rgba(24, 24, 27, 0.4)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            borderRadius: 28,
            padding: "50px 40px",
            boxShadow: "0 15px 35px rgba(0,0,0,0.3)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: "#fafafa", marginBottom: 10 }}>Bizimle İletişime Geçin</h2>
            <p style={{ color: "#a1a1aa", fontSize: 14 }}>
              Platformumuz hakkında sorularınız varsa veya size özel teklif almak istiyorsanız formu doldurun.
            </p>
          </div>

          {contactSuccess ? (
            <div 
              style={{ 
                color: "#10b981", 
                background: "rgba(16, 185, 129, 0.08)", 
                border: "1px solid rgba(16, 185, 129, 0.2)", 
                padding: "24px 30px", 
                borderRadius: 16,
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12
              }}
            >
              <span style={{ fontSize: 44 }}>✅</span>
              <h4 style={{ fontSize: 18, fontWeight: 700 }}>Mesajınız Başarıyla İletildi!</h4>
              <p style={{ fontSize: 14, color: "#a1a1aa" }}>Ekibimiz e-posta adresiniz üzerinden en kısa sürede sizinle iletişime geçecektir.</p>
              <button 
                onClick={() => setContactSuccess(false)}
                className="admin-btn-sm"
                style={{ marginTop: 12, padding: "8px 20px" }}
              >
                Yeni Mesaj Gönder
              </button>
            </div>
          ) : (
            <form onSubmit={handleContactSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <label style={{ fontSize: 13, color: "#a1a1aa" }}>Adınız Soyadınız</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Mustafa Öztürk"
                    required
                    className="admin-input"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, background: "rgba(0,0,0,0.2)", color: "#fafafa" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                  <label style={{ fontSize: 13, color: "#a1a1aa" }}>Kurumsal E-posta</label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="ornek@kurum.com"
                    required
                    className="admin-input"
                    style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, background: "rgba(0,0,0,0.2)", color: "#fafafa" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#a1a1aa" }}>Konu</label>
                <input
                  type="text"
                  value={contactSubject}
                  onChange={(e) => setContactSubject(e.target.value)}
                  placeholder="Demo Görüşmesi / Özel Paket / Teknik Destek"
                  className="admin-input"
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, background: "rgba(0,0,0,0.2)", color: "#fafafa" }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 13, color: "#a1a1aa" }}>Mesajınız</label>
                <textarea
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="Detaylı bilgi almak istediğiniz konuları buraya yazabilirsiniz..."
                  required
                  rows={5}
                  className="admin-input"
                  style={{ width: "100%", padding: "10px 14px", resize: "none", fontFamily: "inherit", border: "1px solid rgba(255, 255, 255, 0.08)", borderRadius: 10, background: "rgba(0,0,0,0.2)", color: "#fafafa" }}
                />
              </div>

              {contactError && (
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
                  ⚠️ {contactError}
                </div>
              )}

              <button
                type="submit"
                disabled={contactLoading}
                className="admin-btn-primary btn-glow"
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  marginTop: 10,
                  background: "#6366f1",
                  border: "none",
                  borderRadius: 10,
                  color: "#fff",
                  cursor: "pointer",
                }}
              >
                {contactLoading ? (
                  <>
                    <span className="loading-spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    Gönderiliyor...
                  </>
                ) : (
                  "Mesajımı İlet"
                )}
              </button>

            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          background: "#09090b",
          borderTop: "1px solid rgba(255, 255, 255, 0.04)",
          padding: "80px 24px 40px",
          fontSize: 13,
          color: "#71717a",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 40, marginBottom: 60, textAlign: "left" }}>
            {/* Column 1: Brand info */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <BrandLogo width={32} height={32} />
                <span style={{ fontWeight: 800, fontSize: 18, color: "#fafafa", letterSpacing: "-0.01em" }}>Aydım</span>
              </div>
              <p style={{ color: "#a1a1aa", lineHeight: 1.6 }}>
                Yapay zeka destekli kurumsal eğitim yönetim sistemi. Tauri OMR entegrasyonu ve anlık veli bilgilendirme altyapısı.
              </p>
            </div>

            {/* Column 2: Navigation */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ color: "#fafafa", fontWeight: 700, margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em" }}>Platform</h4>
              <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <a href="#features" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Özellikler</a>
                <a href="#ai-preview" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Rehberlik Simülatörü</a>
                <a href="#about" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Hakkımızda</a>
                <a href="#pricing" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Fiyatlandırma / Demo</a>
              </nav>
            </div>

            {/* Column 3: Legal Pages */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ color: "#fafafa", fontWeight: 700, margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em" }}>Yasal</h4>
              <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Link href="/kvkk" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>KVKK Aydınlatma Metni</Link>
                <Link href="/privacy" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Gizlilik Politikası</Link>
                <Link href="/terms" style={{ color: "#71717a", textDecoration: "none" }} onMouseEnter={(e) => e.currentTarget.style.color = "#fafafa"} onMouseLeave={(e) => e.currentTarget.style.color = "#71717a"}>Kullanım Koşulları</Link>
              </nav>
            </div>

            {/* Column 4: Contact details */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ color: "#fafafa", fontWeight: 700, margin: 0, textTransform: "uppercase", fontSize: 12, letterSpacing: "0.05em" }}>İletişim</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, color: "#a1a1aa" }}>
                <span>✉️ destek@aydim.com</span>
                <span>📍 KVKK ve Uçtan Uca Şifreli Bulut Altyapısı</span>
              </div>
            </div>
          </div>

          <div style={{ borderTop: "1px solid rgba(255, 255, 255, 0.04)", paddingTop: 30, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
            <div>
              &copy; {new Date().getFullYear()} Aydım. Tüm Hakları Saklıdır. KVKK ve Zero-Knowledge Korumalı Altyapı.
            </div>
            <div style={{ color: "#71717a", fontSize: 11 }}>
              aydim.com
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

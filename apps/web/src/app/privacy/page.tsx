import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gizlilik Politikası | Aydım",
  description: "Aydım platformunun veri gizliliği, çerezler ve bilgi güvenliği politikası.",
};

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: "radial-gradient(ellipse at top, #1e1b4b, #09090b)",
        color: "#f4f4f5",
        minHeight: "100vh",
        padding: "80px 24px",
        fontFamily: "'Outfit', 'Inter', sans-serif",
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <Link href="/" style={{ color: "#a5b4fc", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
            ← Ana Sayfaya Dön
          </Link>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              background: "linear-gradient(135deg, #a78bfa, #60a5fa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginTop: 20,
              marginBottom: 10,
            }}
          >
            Gizlilik Politikası
          </h1>
          <p style={{ color: "#71717a", fontSize: 13 }}>Son Güncelleme: 14 Haziran 2026</p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: 15, lineHeight: 1.7, color: "#d4d4d8" }}>
          <section>
            <p>
              Sedusis olarak, platformumuzu kullanan tüm kurum ve bireylerin gizlilik haklarını korumayı taahhüt ediyoruz.
              Bu Gizlilik Politikası, platformumuzun (web sitesi, Tauri masaüstü uygulaması ve API servisleri)
              kullanımı sırasında elde edilen verilerin türlerini, nasıl saklandığını ve güvenliğinin nasıl sağlandığını açıklamaktadır.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>1. Toplanan Bilgiler ve Toplanma Yöntemleri</h2>
            <p>Platformumuz üzerinden toplanan bilgiler şunlardır:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong>Hesap Bilgileri:</strong> Kurum kaydı sırasında yöneticilerin ve öğretmenlerin belirlediği ad, soyad, e-posta adresi ve giriş şifreleri.</li>
              <li><strong>Öğrenci ve Sınav Kayıtları:</strong> Sınıf listeleri, veli iletişim numaraları, optik form tarama çıktıları ve sınav sonuçları.</li>
              <li><strong>Cihaz ve Bağlantı Bilgileri:</strong> Masaüstü OMR okuma yazılımımızın API ile senkronize olması sırasında kullanılan işletim sistemi türü, IP adresi ve işlem logları.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>2. Sıfır Bilgi (Zero-Knowledge) Mimarisi ve Veri Şifreleme</h2>
            <p>
              Sedusis, veri gizliliğini tasarımdan itibaren (privacy-by-design) korumak için tasarlanmıştır.
              Platformumuzda saklanan tüm hassas öğrenci kimlik verileri ve veli irtibat numaraları, veritabanına kaydedilmeden önce
              şifrelenir. Bu şifreleme anahtarları, sisteme siber saldırı düzenlense dahi verilerin çözülmesini ve okunmasını imkansız kılar.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>3. Çerezler (Cookies) ve Analitik Araçlar</h2>
            <p>
              Sedusis, yalnızca kullanıcı oturumlarını doğrulamak ve güvenliği sağlamak amacıyla gerekli olan teknik çerezleri (session cookies) kullanır.
              Platformumuzda kullanıcı hareketlerini takip eden reklam çerezleri veya üçüncü taraf takip kodları bulunmamaktadır.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>4. Veri Saklama ve Güvenliği</h2>
            <p>
              Verileriniz, uluslararası güvenlik sertifikalarına sahip yüksek korumalı bulut sunucularımızda saklanmaktadır.
              Masaüstü Tauri OMR okuyucu yazılımımız ise verileri internet kesintilerine karşı yerel bir SQLite önbelleğinde depolar.
              İnternet bağlantısı sağlandığında bu veriler güvenli HTTPS/SSL protokolü üzerinden buluta aktarılır ve yerel önbellek otomatik temizlenir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>5. Değişiklikler</h2>
            <p>
              Sedusis, gizlilik politikasını platform geliştirmelerine veya yasal mevzuat değişikliklerine uyum sağlamak amacıyla zaman zaman güncelleyebilir.
              Güncellemeler bu sayfada yayınlandığı andan itibaren geçerlilik kazanır.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>6. Bize Ulaşın</h2>
            <p>
              Gizlilik politikamız veya veri güvenliği standartlarımız hakkında her türlü sorunuz için
              <strong>destek@aydim.com</strong> e-posta adresi üzerinden bizimle iletişime geçebilirsiniz.
            </p>
          </section>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 60, borderTop: "1px solid rgba(255, 255, 255, 0.08)", paddingTop: 30, textAlign: "center" }}>
          <p style={{ color: "#71717a", fontSize: 14 }}>
            &copy; {new Date().getFullYear()} Sedusis. Tüm Hakları Saklıdır.
          </p>
        </div>
      </div>
    </main>
  );
}

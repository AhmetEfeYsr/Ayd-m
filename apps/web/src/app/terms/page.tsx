import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kullanım Koşulları | Aydım",
  description: "Aydım platformunun kullanım şartları, sorumluluk sınırları ve kurumsal üyelik kuralları.",
};

export default function TermsPage() {
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
            Kullanım Koşulları
          </h1>
          <p style={{ color: "#71717a", fontSize: 13 }}>Son Güncelleme: 14 Haziran 2026</p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: 15, lineHeight: 1.7, color: "#d4d4d8" }}>
          <section>
            <p>
              Sedusis platformuna (web sitesi, masaüstü uygulaması ve API servisleri dahil) hoş geldiniz.
              Platformumuzu ziyaret ederek, kayıt oluşturarak veya hizmetlerimizi kullanarak, aşağıda belirtilen
              Kullanım Koşullarını kabul etmiş olursunuz. Lütfen bu koşulları dikkatlice okuyunuz.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>1. Hizmet Tanımı ve Demo Sürümü</h2>
            <p>
              Sedusis, eğitim kurumlarına yönelik bulut tabanlı bir yönetim, Tauri tabanlı optik okuma (OMR),
              yapay zeka destekli rehberlik analitiği ve veli yoklama/iletişim sistemi sağlayan bir yazılım hizmetidir (SaaS).
              Hizmetimiz şu an <strong>Lansman Öncesi Demo Sürümündedir</strong>.
              Demo sürümü kapsamında maksimum <strong>30 dershane</strong> kaydı alınacak ve sistem genelinde toplam **30.000 öğrenci** sınırı uygulanacaktır.
              Demo sürecinde sunulan tüm hizmetler ve Tauri masaüstü OMR yazılımı tamamen ücretsizdir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>2. Hesap Güvenliği ve Kurum Sorumluluğu</h2>
            <p>
              Platforma kayıt yaptıran eğitim kurumları, yönetici ve öğretmen hesaplarının şifre güvenliğini sağlamaktan kendileri sorumludur.
              Kurumlar, sisteme kaydettikleri öğrencilerin ve velilerin kişisel verilerini KVKK'ya uygun olarak girmekle yükümlüdür.
              Hesapların yetkisiz üçüncü şahıslar tarafından kullanılması durumunda doğacak zararlardan Sedusis sorumlu tutulamaz.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>3. İletişim Servisleri ve Entegrasyonlar</h2>
            <p>
              Sedusis, veli yoklama ve bildirim gönderimleri için Netgsm SMS ve WhatsApp Cloud API entegrasyonları sunar.
              Gönderim maliyetleri doğrudan kurumun kendi operatör anlaşması üzerinden karşılanır.
              Sedusis, bu üçüncü taraf servislerin (Netgsm, WhatsApp/Meta) kesintilerinden, geçici servis dışı kalmalarından
              veya iletişim altyapılarındaki teknik hatalardan sorumlu değildir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>4. Kullanım Sınırlamaları</h2>
            <p>Platformumuzu kullanırken aşağıdaki kurallara uyulması zorunludur:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Sistemin işleyişini bozmaya, engellemeye veya aşırı yük oluşturmaya yönelik eylemlerde bulunulamaz (DDOS, SQL Injection vb.).</li>
              <li>Masaüstü Tauri OMR programı tersine mühendislik işlemlerine veya kaynak kodlarının çalınmasına tabi tutulamaz.</li>
              <li>Sisteme yanıltıcı, asılsız veya üçüncü şahısların haklarını ihlal eden veriler girilemez.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>5. Hizmet Kesintileri ve Sorumluluk Sınırları</h2>
            <p>
              Sedusis, platformun kesintisiz ve hatasız çalışması için gerekli teknik hassasiyeti göstermektedir.
              Ancak, lansman öncesi demo sürümü olması nedeniyle sistemde yapılacak güncellemeler, veri tabanı bakım çalışmaları
              veya beklenmeyen altyapı kesintileri sırasında oluşabilecek geçici erişim sorunlarından dolayı doğabilecek operasyonel
              aksamalardan Sedusis hukuken sorumlu değildir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>6. Koşullarda Değişiklik Hakları</h2>
            <p>
              Sedusis, bu kullanım koşullarını dilediği zaman güncelleme hakkını saklı tutar.
              Güncellenen kullanım koşulları web sitemizde yayınlandığı andan itibaren geçerli sayılır.
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

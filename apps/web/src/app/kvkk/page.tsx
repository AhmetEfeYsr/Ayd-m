import React from "react";
import Link from "next/link";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "KVKK Aydınlatma Metni | Aydım",
  description: "Aydım platformunun 6698 sayılı Kişisel Verilerin Korunması Kanunu uyarınca kişisel verilerin işlenmesi ve korunması esasları.",
};

export default function KvkkPage() {
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
            Kişisel Verilerin Korunması Kanunu (KVKK) Aydınlatma Metni
          </h1>
          <p style={{ color: "#71717a", fontSize: 13 }}>Son Güncelleme: 14 Haziran 2026</p>
        </div>

        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: 28, fontSize: 15, lineHeight: 1.7, color: "#d4d4d8" }}>
          <section>
            <p>
              <strong>Sedusis</strong> olarak, platformumuzu kullanan eğitim kurumlarının (dershane, okul, etüt merkezleri),
              yöneticilerin, öğretmenlerin, öğrencilerin ve velilerin kişisel verilerinin korunmasına büyük önem veriyoruz.
              6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca, veri sorumlusu sıfatıyla,
              kişisel verilerinizi aşağıda açıklanan çerçevede ve mevzuata uygun olarak işliyoruz.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>1. Veri Sorumlusu</h2>
            <p>
              Sedusis platformu kapsamında işlenen kişisel veriler bakımından, verileri sisteme giren/kaydeden üye eğitim kurumu
              <strong> Veri Sorumlusu</strong>, bu verilerin güvenli bir şekilde depolanması, işlenmesi ve yapay zeka analizlerinin
              yapılması için altyapı sağlayan Sedusis ise <strong>Veri İşleyen</strong> konumundadır.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>2. İşlenen Kişisel Verileriniz</h2>
            <p>Platformumuzun kullanımı kapsamında aşağıdaki kategorilerde kişisel veriler işlenebilmektedir:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, TC kimlik numarası (öğrenci).</li>
              <li><strong>İletişim Bilgileri:</strong> E-posta adresi, cep telefonu numarası (yönetici, öğretmen, öğrenci, veli).</li>
              <li><strong>Eğitim ve Sınav Bilgileri:</strong> Sınıf/şube bilgisi, deneme sınavı sonuçları, optik form cevapları, konu yanlışları ve eksik analizleri.</li>
              <li><strong>İşlem Güvenliği:</strong> IP adresi, sisteme giriş-çıkış logları, Tauri OMR yazılımı senkronizasyon logları.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>3. Kişisel Verilerin İşlenme Amaçları</h2>
            <p>Kişisel verileriniz, kanuna uygun olarak aşağıdaki amaçlarla işlenmektedir:</p>
            <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
              <li>Platformun üye kuruma sunulması, kullanıcı hesaplarının oluşturulması ve yetkilendirilmesi,</li>
              <li>Tauri OMR optik okuyucu entegrasyonu ile sınav sonuçlarının dijital ortama aktarılması,</li>
              <li>Sınav sonuçlarındaki konu eksiklerinin MEB kazanım grafiğine göre yapay zeka analizlerinin yapılması ve kişiye özel haftalık hedefler atanması,</li>
              <li>Yoklama takibi yapılarak, derse/sınava katılmayan öğrencilerin velilerine Netgsm SMS veya WhatsApp Cloud API üzerinden otomatik bildirimlerin iletilmesi,</li>
              <li>Sistem güvenliğinin ve KVKK uyumluluğunun denetlenmesi.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>4. Zero-Knowledge (Sıfır Bilgi) ve Güvenlik Altyapımız</h2>
            <p>
              Sedusis, veri güvenliğini en üst düzeye çıkarmak adına <strong>Zero-Knowledge (Sıfır Bilgi)</strong> mimarisi ile çalışmaktadır.
              Öğrencilerin sınav sonuçları ve hassas veli iletişim detayları veritabanımızda uçtan uca şifreli (encrypted) olarak depolanır.
              Bu sayede, sistem yöneticilerimiz dahil olmak üzere yetkisiz hiçbir üçüncü taraf verilerinize doğrudan erişemez.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>5. Kişisel Verilerin Aktarılması</h2>
            <p>
              Sedusis, verilerinizi ticari veya reklam amaçlı olarak üçüncü şahıslarla asla paylaşmaz veya satmaz.
              Verileriniz, yalnızca kurumunuzun entegre ettiği onaylı altyapı sağlayıcıları (Netgsm SMS Gateway, WhatsApp/Meta Business Cloud API)
              ve altyapı sunucularımız üzerinden işlenir. Yasal zorunluluk hallerinde yetkili kamu kurum ve kuruluşları ile paylaşılabilecektir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fafafa", marginBottom: 12 }}>6. İlgili Kişinin Hakları</h2>
            <p>
              KVKK'nın 11. maddesi kapsamında, kişisel veri sahipleri olarak verilerinizin silinmesini, düzeltilmesini,
              işlenip işlenmediğini öğrenmeyi ve ilgili tüm haklarınızı kullanmayı talep edebilirsiniz.
              Bu haklarınızı kullanmak için kurum yöneticinize veya <strong>destek@aydim.com</strong> e-posta adresimize başvuruda bulunabilirsiniz.
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

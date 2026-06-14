import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from root
dotenv.config({ path: path.join(__dirname, '../.env') });

const API_ENDPOINT = process.env.API_ENDPOINT || process.env.NEXT_PUBLIC_APP_URL || 'https://aydim.com';
const API_TOKEN = process.env.API_TOKEN;

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || 'Aydım <noreply@aydim.com>';
const RESEND_API_KEY = process.env.RESEND_API_KEY;

if (!API_TOKEN) {
  console.error('Hata: API_TOKEN .env dosyasında bulunamadı!');
  process.exit(1);
}

let transporter: any = null;

if (RESEND_API_KEY) {
  console.log('Resend API Anahtarı tespit edildi. E-postalar Resend API üzerinden gönderilecek.');
} else if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
  console.log('SMTP ayarları tespit edildi. E-postalar SMTP üzerinden gönderilecek.');
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: false // spama düşmesi sorun değil, SSL sertifika hatalarında durmasın
    }
  });
} else {
  console.error('Hata: E-posta gönderimi için ne RESEND_API_KEY ne de SMTP ayarları (SMTP_HOST, SMTP_USER, SMTP_PASS) .env dosyasında bulunamadı!');
  process.exit(1);
}

async function sendMail(to: string, subject: string, html: string): Promise<boolean> {
  try {
    if (RESEND_API_KEY) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: SMTP_FROM,
          to: [to],
          subject,
          html,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`Resend API Hatası (${to}): ${response.status} - ${errText}`);
        return false;
      }
      return true;
    } else {
      await transporter.sendMail({
        from: SMTP_FROM,
        to,
        subject,
        html,
      });
      return true;
    }
  } catch (error) {
    console.error(`E-posta gönderme hatası (${to}):`, error);
    return false;
  }
}

async function processMailQueue() {
  console.log(`[${new Date().toISOString()}] E-posta kuyruğu kontrol ediliyor...`);
  try {
    // 1. Bekleyen e-postaları çek
    const pendingRes = await fetch(`${API_ENDPOINT}/api/desktop/emails/pending`, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
      },
    });

    if (!pendingRes.ok) {
      console.error(`Pending API hatası: HTTP ${pendingRes.status}`);
      return;
    }

    const { emails } = await pendingRes.json();
    if (!emails || emails.length === 0) {
      console.log('Gönderilmeyi bekleyen e-posta bulunamadı.');
      return;
    }

    console.log(`${emails.length} adet bekleyen e-posta bulundu. Gönderiliyor...`);

    for (const emailLog of emails) {
      const { id, payload } = emailLog;
      const { to, subject, html } = payload || {};

      if (!to || !subject || !html) {
        console.warn(`Geçersiz e-posta içeriği (Log ID: ${id})`);
        await updateStatus(id, 'FAILED');
        continue;
      }

      console.log(`Gönderiliyor -> Kime: ${to}, Konu: ${subject}`);
      const success = await sendMail(to, subject, html);
      
      if (success) {
        console.log(`Başarılı -> Kime: ${to}`);
        await updateStatus(id, 'SENT');
      } else {
        console.log(`Başarısız -> Kime: ${to}`);
        await updateStatus(id, 'FAILED');
      }
    }
  } catch (error) {
    console.error('Kuyruk işleme sırasında bir hata oluştu:', error);
  }
}

async function updateStatus(id: string, status: 'SENT' | 'FAILED') {
  try {
    const res = await fetch(`${API_ENDPOINT}/api/desktop/emails/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify({ id, status }),
    });

    if (!res.ok) {
      console.error(`Status güncelleme başarısız (ID: ${id}): HTTP ${res.status}`);
    }
  } catch (error) {
    console.error(`Status API bağlantı hatası (ID: ${id}):`, error);
  }
}

// 30 saniyede bir çalıştır
const INTERVAL_MS = 30000;
processMailQueue();
setInterval(processMailQueue, INTERVAL_MS);

console.log(`Yerel SMTP Mail Gönderici aktif. Her ${INTERVAL_MS / 1000} saniyede bir kuyruğu kontrol edecek.`);

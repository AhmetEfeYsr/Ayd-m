1. Veritabanı (Neon / PostgreSQL)
Sistemdeki tüm veri saklama ve sorgulama işlemleri için gereklidir.

DATABASE_URL: PostgreSQL bağlantı adresi (NeonDB, Supabase vb.).
2. Kimlik Doğrulama (Firebase Auth)
Kullanıcı yönetimi, API güvenliği ve oturum kontrolü için gereklidir.

FIREBASE_PROJECT_ID: Firebase Proje ID'si.
FIREBASE_CLIENT_EMAIL: Firebase Admin SDK servis hesabı e-postası.
FIREBASE_PRIVATE_KEY: Firebase Admin SDK servis hesabı özel anahtarı.
NEXT_PUBLIC_FIREBASE_API_KEY: Firebase istemci tarafı API anahtarı.
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: Firebase Auth Domain adresi.
NEXT_PUBLIC_FIREBASE_PROJECT_ID: Firebase Proje ID'si (istemci tarafı).
NEXT_PUBLIC_FIREBASE_APP_ID: Firebase Uygulama ID'si.
3. Yapay Zeka (Google Gemini)
OMR analizleri, Tutor Bot ve veri analitiği servisleri için gereklidir.

GEMINI_API_KEY: Google AI Studio'dan alınan API anahtarı.
4. Güvenlik ve Şifreleme (Crypto)
MASTER_SALT: Sistem genelindeki şifreleme ve hashing işlemleri için kullanılan tuzlama değeri (En az 16 karakter).
DESKTOP_API_SECRET: (Opsiyonel) Masaüstü uygulamasının sunucuya attığı istekleri doğrulamak için kullanılan JWT secret anahtarı. (Tanımlanmazsa MASTER_SALT kullanılır).
5. Obje Depolama (Cloudflare R2 / S3)
Optik form görselleri ve sonuç raporlarının saklanması için gereklidir.

CLOUDFLARE_ACCOUNT_ID: R2 API endpoint'ini oluşturmak için hesap ID'si.
R2_ACCESS_KEY_ID: S3 uyumlu erişim anahtarı.
R2_SECRET_ACCESS_KEY: S3 uyumlu gizli anahtar.
R2_BUCKET_NAME: Verilerin saklanacağı bucket adı (Varsayılan: omr-results).
6. Kuyruk ve Cache (Upstash)
Asenkron işlemler (OMR işleme vb.) ve performans için gereklidir.

QSTASH_TOKEN: QStash üzerinden mesaj gönderimi için gereken token.
UPSTASH_REDIS_REST_URL: Redis REST API adresi.
UPSTASH_REDIS_REST_TOKEN: Redis erişim token'ı.
7. Bildirim ve Entegrasyon Servisleri (Opsiyonel)
TELEGRAM_BOT_TOKEN: Sistem raporlarının ve kritik hataların Telegram üzerinden bildirilmesi için.
SMS_API_ENDPOINT: SMS gönderimi için API URL (Örn: NetGSM).
SMS_API_USER: SMS servisi kullanıcı adı.
SMS_API_PASS: SMS servisi şifresi.
WHATSAPP_API_ENDPOINT: WhatsApp Business API adresi (Örn: https://graph.facebook.com/v17.0/PHONE_NUMBER_ID/messages).
WHATSAPP_API_TOKEN: WhatsApp API erişim token'ı.

8. Uygulama URL ve Ortam Ayarları
NEXT_PUBLIC_APP_URL: Web uygulamasının canlıdaki ana URL'si (Örn: https://aydim.com).
EXPO_PUBLIC_API_URL: Mobil uygulamanın bağlanacağı API base URL'si.
NODE_ENV: development veya production belirteci.
# 🛡️ RateGuard Automation

RateGuard, sözleşme yenileme süreçlerini rol tabanlı bir iş akışına bağlayan bir web uygulamasıdır. Sistem; Sales, Finance, Company Admin, HR ve client rollerinin görevlerini birbirinden ayırır, sözleşme versiyonlarını takip eder, hesaplama ve onay adımlarını kaydeder, müşteri iletişimini destekler ve kritik işlemleri audit log üzerinden izlenebilir hale getirir.

---

## 📋 Güncel Kapsam

- Rol tabanlı dashboard ve yetkilendirme
- Sözleşme oluşturma, yenileme, yeni versiyon ve eski versiyon geçmişi
- Finance hesaplama kontrolü ve Company Admin onay akışı
- Client'a sözleşme gönderme, client onay/red süreci
- AI değişiklik analizi, RateBot ve AI e-posta oluşturucu
- Supabase Realtime destekli şirket içi sohbet
- Okundu/okunmadı mesaj sayacı ve read-state takibi
- Audit Log: request ID, aktör, IP, user agent ve before/after değişiklikleri
- Profil ayarları ve şifre değiştirme
- HR başvuru yönetimi, hazır/üretilen karar mesajları ve e-posta bildirimi
- Workflow sayfası: HR, Finance, Sales ve Company Admin için rol rehberi
- Avrupa tarih formatıyla görüntüleme
- JSON hata yönetimi ve yapılandırılmış backend loglama

---

## 👥 Roller ve Ana Sorumluluklar

### 💼 Sales

- İlk sözleşme taslağını oluşturur.
- Draft aşamasındaki ticari alanları düzenler.
- Finance ve Company Admin onaylarından sonra sözleşmeyi client'a gönderir.
- Finalize edilmiş sözleşmeler için yeni versiyon sürecini başlatır.

### 💰 Finance

- Yenileme hesabını, enflasyon kuralını, kaynak bilgisini, cap değerini ve yeni tutarı kontrol eder.
- Gerekirse draft hesaplama değerlerini kaydeder.
- Finance onayı vererek sözleşmeyi Company Admin incelemesine hazırlar.
- Gerekli durumlarda Sales ekibini bilgilendirir.

### 🏢 Company Admin

- Şirket kullanıcılarını ve rollerini yönetir.
- Client ve karşı taraf ilişkilerini yönetir.
- Finance tarafından onaylanan sözleşmeyi client'a gönderilmeden önce son kez onaylar.
- Audit Log, Analytics ve otomasyon ayarlarını takip eder.

### 🧑‍💼 HR

- Şirket için gelen departman başvurularını inceler.
- Sales, Finance veya HR rol atamalarını onaylar ya da reddeder.
- Kabul/red kararlarında e-postaya eklenecek mesajları yönetir.

---

## 🔄 Sözleşme Yaşam Döngüsü

1. **Draft** — Sales veya Admin sözleşme taslağını oluşturur.
2. **Finance Review** — Finance; tutar, kaynak, kural ve limitleri kontrol eder.
3. **Finance Approved** — Hesaplama doğrulanır.
4. **Admin Review / Admin Approved** — Company Admin, client'a göndermeden önce son onayı verir.
5. **Sent To Client** — Sales sözleşmeyi client'a gönderir.
6. **Client Decision** — Client onaylar veya reddeder.
7. **New Version** — Finalize edilmiş sözleşmeler yeni dönem veya revizyon için yeni versiyonla devam eder.

> Eski sözleşme versiyonları silinmez. Aktif listelerde güncel versiyon öne çıkar, eski versiyonlar versiyon geçmişinde tutulur.

---

## 🏗️ Teknik Mimari

### 🖥️ Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Recharts
- Supabase Realtime client

### ⚙️ Backend

- Python / Flask
- Supabase Python client
- Flask-CORS
- ReportLab PDF üretimi
- Google Gemini entegrasyonu
- APScheduler ile yenileme otomasyonu
- Yapılandırılmış JSON loglama ve global hata yönetimi

### 🗄️ Veritabanı

- Supabase / PostgreSQL
- Başlıca veri tabloları:
  - `users`
  - `companies`
  - `contracts`
  - `audit_logs`
  - `internal_chat_conversations`
  - `internal_chat_messages`
  - `notifications`
  - `applications`
  - `automation settings/logs`

---

## 📄 Önemli Sayfalar

| Sayfa | Açıklama |
|---|---|
| `/dashboard` | Role göre ana panel |
| `/workflows` | Rol tabanlı iş akışı ve sorumluluk özeti |
| `/renewal-review` | Sözleşme inceleme, hesaplama, onay, client gönderimi ve versiyonlar |
| `/clients` | Client/karşı taraf yönetimi |
| `/analytics` | Finansal etki ve portföy analizi |
| `/audit-log` | İzlenebilir işlem geçmişi |
| `/internal-chat` | Şirket içi mesajlaşma |
| `/application-management` | HR/Admin başvuru yönetimi |
| `/profile` | Profil ve şifre ayarları |

---

## 🔐 Ortam Değişkenleri

Backend `.env` dosyası `backend/.env` veya repo kökünde `.env` olarak okunabilir.

```env
APP_ENV=development
APP_SECRET_KEY=change-me
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
TCMB_API_KEY=your-tcmb-key
GEMINI_API_KEY=your-gemini-key

APP_BASE_URL=http://localhost:5173
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASSWORD=your-app-password
SMTP_FROM_EMAIL=your-email@example.com

CRON_SECRET=change-me
APP_TIMEZONE=Europe/Istanbul
AUTOMATION_CRON_HOUR_UTC=5
AUTOMATION_CRON_MINUTE_UTC=0
```

Frontend için `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

> Frontend API istekleri `/api` path'i üzerinden gider. Lokal geliştirmede Vite proxy bu istekleri `http://127.0.0.1:5000` backend'ine yönlendirir. Render gibi production ortamlarda frontend servisi için `/api` path'inin backend servisine rewrite/proxy edilmesi gerekir.

> Supabase Realtime kullanmak için Supabase dashboard üzerinden `internal_chat_messages` ve `internal_chat_conversations` tablolarının realtime publication'a eklenmesi gerekir.

---

## 🚀 Lokal Çalıştırma

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

> Backend varsayılan olarak Flask üzerinde çalışır. Production deploy için Gunicorn kullanılabilir.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

> Vite dev server varsayılan olarak `http://localhost:5173` adresinde çalışır.

---

## 🧪 Test ve Doğrulama

**Backend testleri:**

```bash
python -m unittest discover -s backend/tests -p "test_*.py"
```

**Frontend kontrolleri:**

```bash
cd frontend
npm run lint
npm run build
```

> ⚠️ Production build sırasında bundle size uyarısı görülebilir. Bu şu an için bir hata değildir; ileride route tabanlı code splitting ile iyileştirilebilir.

---

## 🔒 Güvenlik ve İzlenebilirlik

- Backend, rol ve şirket kapsamı kontrollerini uygular.
- Audit log kayıtları hassas alanları maskeler.
- `password`, `token`, `secret`, `code`, `hash` gibi alanlar loglarda açık tutulmaz.
- Her istek için `X-Request-Id` üretilebilir veya dışarıdan alınabilir.
- Global hata yöneticisi kullanıcıya JSON hata ve request ID döndürür.
- Company Admin yalnızca kendi şirket kapsamını, Super Admin ise tüm kapsamı görebilir.

---

## 🌐 Production için Notlar

Bu proje MVP/demo kapsamında güçlü bir temel sunar. Gerçek production ortamı için aşağıdaki ek güçlendirmeler önerilir:

- Supabase Row Level Security politikalarının tam uygulanması
- Daha kapsamlı unit/integration/e2e testleri
- Mail retry queue ve delivery status takibi
- Audit log pagination, tarih filtresi ve retention politikası
- Monitoring/alerting ve merkezi log toplama
- Rate limiting ve abuse koruması
- Veritabanı migration yönetimi
- Frontend route tabanlı code splitting

---

## 🚢 Deploy Notları

Render gibi ortamlarda backend ve frontend ortam değişkenleri ayrıca tanımlanmalıdır. Frontend build ortamında `VITE_` ile başlayan değişkenler kullanılır; backend tarafında Supabase service key ve secret değerleri yalnızca sunucu ortamında tutulmalıdır.
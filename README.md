# RateGuard Automation

RateGuard, sozlesme yenileme sureclerini rol bazli bir workflow'a baglayan bir web uygulamasidir. Sistem; Sales, Finance, Company Admin, HR ve client rollerinin gorevlerini ayirir, sozlesme versiyonlarini takip eder, hesaplama/onay adimlarini kaydeder, musteri iletisimini destekler ve kritik islemleri audit log uzerinden izlenebilir hale getirir.

## Guncel Kapsam

- Rol bazli dashboard ve yetkilendirme
- Sozlesme olusturma, yenileme, yeni versiyon ve eski versiyon gecmisi
- Finance hesaplama kontrolu ve Company Admin onay akisi
- Client'a sozlesme gonderme, client approval/rejection sureci
- AI change analysis, RateBot ve AI email composer
- Supabase Realtime destekli internal chat
- Okundu/okunmadi mesaj sayaci ve read-state takibi
- Audit Log: request id, actor, IP, user agent ve before/after degisiklikleri
- Profil ayarlari ve sifre degistirme
- HR basvuru yonetimi, hazir/uretilen karar mesajlari ve mail bildirimi
- Workflow sayfasi: HR, Finance, Sales ve Company Admin icin rol rehberi
- Avrupa tarih formatiyla goruntuleme
- JSON error handling ve structured backend logging

## Roller ve Ana Sorumluluklar

### Sales

- Ilk sozlesme taslagini olusturur.
- Draft asamasindaki ticari alanlari duzenler.
- Finance ve Company Admin onaylarindan sonra sozlesmeyi client'a gonderir.
- Finalize sozlesmeler icin yeni versiyon surecini baslatir.

### Finance

- Yenileme hesabini, enflasyon kuralini, kaynak bilgisini, cap degerini ve yeni tutari kontrol eder.
- Gerekirse draft hesaplama degerlerini kaydeder.
- Finance approval vererek sozlesmeyi Company Admin incelemesine hazirlar.
- Gerekli durumda Sales ekibini bilgilendirir.

### Company Admin

- Sirket kullanicilarini ve rollerini yonetir.
- Client ve counterparty iliskilerini yonetir.
- Finance tarafindan onaylanan sozlesmeyi client'a gonderilmeden once son kez onaylar.
- Audit Log, Analytics ve otomasyon ayarlarini takip eder.

### HR

- Sirket icin gelen departman basvurularini inceler.
- Sales, Finance veya HR rol atamalarini onaylar ya da reddeder.
- Kabul/red kararlarinda e-postaya eklenecek mesajlari yonetir.

## Sozlesme Yasam Dongusu

1. **Draft**: Sales veya Admin sozlesme taslagini olusturur.
2. **Finance Review**: Finance tutar, kaynak, kural ve limitleri kontrol eder.
3. **Finance Approved**: Hesaplama dogrulanir.
4. **Admin Review / Admin Approved**: Company Admin client'a gondermeden once son onayi verir.
5. **Sent To Client**: Sales sozlesmeyi client'a gonderir.
6. **Client Decision**: Client onaylar veya reddeder.
7. **New Version**: Finalize edilmis sozlesmeler yeni donem veya revizyon icin yeni versiyonla devam eder.

Eski sozlesme versiyonlari silinmez. Aktif listelerde current version one cikar, eski versiyonlar versiyon gecmisinde tutulur.

## Teknik Mimari

### Frontend

- React 19
- Vite
- Tailwind CSS
- React Router
- Recharts
- Supabase Realtime client

### Backend

- Python / Flask
- Supabase Python client
- Flask-CORS
- ReportLab PDF uretimi
- Google Gemini entegrasyonu
- APScheduler ile renewal automation
- Structured JSON logging ve global error handling

### Database

- Supabase / PostgreSQL
- Baslica veri alanlari:
  - users
  - companies
  - contracts
  - audit_logs
  - internal_chat_conversations
  - internal_chat_messages
  - notifications
  - applications
  - automation settings/logs

## Onemli Sayfalar

- `/dashboard`: Role gore ana panel
- `/workflows`: Rol bazli workflow ve sorumluluk ozeti
- `/renewal-review`: Kontrat inceleme, hesaplama, onay, client gonderimi ve versiyonlar
- `/clients`: Client/counterparty yonetimi
- `/analytics`: Finansal etki ve portfoy analizi
- `/audit-log`: Izlenebilir islem gecmisi
- `/internal-chat`: Sirket ici mesajlasma
- `/application-management`: HR/Admin basvuru yonetimi
- `/profile`: Profil ve sifre ayarlari

## Ortam Degiskenleri

Backend `.env` dosyasi `backend/.env` veya repo kokunde `.env` olarak okunabilir.

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

Frontend icin `frontend/.env`:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Frontend API istekleri `/api` path'i uzerinden gider. Lokal gelistirmede Vite proxy bu istekleri `http://127.0.0.1:5000` backend'ine yonlendirir. Render gibi production ortamlarda frontend service icin `/api` path'inin backend service'e rewrite/proxy edilmesi gerekir.

Supabase Realtime kullanmak icin Supabase dashboard uzerinden `internal_chat_messages` ve `internal_chat_conversations` tablolarinin realtime publication'a eklenmesi gerekir.

## Lokal Calistirma

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Backend varsayilan olarak Flask uzerinde calisir. Production deploy icin Gunicorn kullanilabilir.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Vite dev server varsayilan olarak `http://localhost:5173` adresinde calisir.

## Test ve Dogrulama

Backend testleri:

```bash
python -m unittest discover -s backend/tests -p "test_*.py"
```

Frontend kontrolleri:

```bash
cd frontend
npm run lint
npm run build
```

Not: Production build sirasinda bundle size uyarisi gorulebilir. Bu su anda hata degildir; ileride route bazli code splitting ile iyilestirilebilir.

## Guvenlik ve Izlenebilirlik

- Backend role ve company scope kontrolleri uygular.
- Audit log kayitlari hassas alanlari maskeler.
- `password`, `token`, `secret`, `code`, `hash` gibi alanlar loglarda acik tutulmaz.
- Her request icin `X-Request-Id` uretilebilir veya disaridan alinabilir.
- Global error handler kullaniciya JSON hata ve request id dondurur.
- Company Admin kendi sirket kapsamini, Super Admin tum kapsami gorebilir.

## Production Icin Notlar

Bu proje MVP/demo kapsaminda guclu bir temel sunar. Gercek production ortami icin asagidaki ek guclendirmeler onerilir:

- Supabase Row Level Security politikalarinin tam uygulanmasi
- Daha kapsamli unit/integration/e2e testleri
- Mail retry queue ve delivery status takibi
- Audit log pagination, tarih filtresi ve retention politikasi
- Monitoring/alerting ve merkezi log toplama
- Rate limiting ve abuse protection
- Database migration yonetimi
- Frontend route bazli code splitting

## Deploy Notlari

Render gibi ortamlarda backend ve frontend environment variable'lari ayrica tanimlanmalidir. Frontend build ortaminda `VITE_` ile baslayan degiskenler kullanilir; backend tarafinda Supabase service key ve secret degerleri sadece server ortaminda tutulmalidir.

# RateGuard - Gercekci Uygulama Gelistirme Notlari

Bu dokuman, projeyi "gercek hayattaki SaaS contract renewal" urunlerine daha cok benzetmek icin eksik ama degerli alanlari ve uygulama adimlarini listeler.

## 1) Bizde Olan + Daha Gercekci Yapmak Icin Eksikler

### A. Operasyonel Dayaniklilik
- **Var olan:** Yenileme, bildirim ve mail altyapisi mevcut.
- **Eksik:** Otomasyonun saat bazli sistematik calismasi ve raporlanmasi.
- **Yapildi:** Gunluk cron scheduler + manuel tetikleme endpointi eklendi.
- **Sonraki adim:** Basarisiz run tekrar deneme (retry) ve dead-letter mantigi.

### B. Yetki ve Onay Zinciri
- **Var olan:** Temel rol bazli yetki.
- **Eksik:** "Auto renew -> admin onayi -> karar" kurumsal akis.
- **Yapildi:** Company admin ayari + `Onayla / Reddet / Revizyona Gonder` karar mekanizmasi.
- **Sonraki adim:** Cift onay (4-eyes principle) opsiyonu.

### C. Denetlenebilirlik (Auditability)
- **Var olan:** Genel audit log tablosu var.
- **Eksik:** Yenileme onay aksiyonlarinin detayli ve ayrik loglanmasi.
- **Yapildi:** `contract_approval_logs` tablosu ve ilgili endpointler eklendi.
- **Sonraki adim:** Log export (CSV), SIEM entegrasyonu.

### D. Musteri Iletisimi
- **Var olan:** Email sablonlari ve gonderim.
- **Eksik:** Otomasyon run ozeti + admin aksiyon mail zinciri.
- **Yapildi:** Admin approval request maili + run summary maili.
- **Sonraki adim:** Email delivery/opens tracking.

### E. UX / Product Gercekciligi
- **Var olan:** Dashboard ve revenue snapshot.
- **Eksik:** Company admin seviyesinde otomasyon policy ayarlari.
- **Yapildi:** Client Management icine admin automation ayar paneli eklendi.
- **Sonraki adim:** Approval queue ekrani (bekleyen isler listesi + tek tik aksiyonlar).

## 2) Bu Cevapta Eklenen Teknik Ozellikler

## Cron Job + Mail Otomasyonu
- Gunluk scheduler eklendi (`APScheduler`).
- Saat env ile yonetiliyor:
  - `AUTOMATION_CRON_HOUR_UTC` (default: `5`)
  - `AUTOMATION_CRON_MINUTE_UTC` (default: `0`)
- Otomasyon akisi:
  1. Son 30 gun icinde bitecek kontratlari toplar.
  2. Sirket ayarina gore:
     - **Onay zorunluysa** `pending_admin_approval` durumuna alir.
     - **Onay zorunlu degilse** `pending_client` durumuna alip musteriyi bilgilendirir.
  3. Sonuc ozeti: zamanlayici ile her tenant için sirketteki company_admin kullanicinin e-postasına gider (Cc: `EMAIL_CONTROL_CC`, varsayilan `mertucan44@gmail.com`). Manuel tetiklemede ozet giriş yapan kullanıcının e-postasına gider.

## Company Admin Onay Mekanizmasi
- Sirket bazli ayar:
  - `require_admin_approval_before_auto_renew`
  - `automation_email_enabled`
- Karar endpointi:
  - `approve` -> kontrat durumu: `approved`
  - `reject` -> kontrat durumu: `rejected`
  - `revise` -> kontrat durumu: `draft`
- Onay loglari:
  - Ayrik tablo: `contract_approval_logs`
  - Her aksiyon metadata + not ile kaydediliyor.

## Frontend (Company Admin Ayari)
- `Client Management` sayfasina "Renewal Automation" ayar kutusu eklendi (bildirim adresi ayri sorulmaz; hedef e-postalar sunucuda company_admin kullanici adresi ile belirlenir).
- Desteklenen aksiyonlar:
  - Onay gereksinimini ac/kapat
  - Mail otomasyonunu ac/kapat
  - "Otomasyonu Simdi Calistir" ile manuel run (ozet e-postasi o an giris yapan kullaniciya gider)

## 3) Veritabani Degisiklikleri (Migration)

Yeni migration dosyasi:
- `backend/migrations/008_automation_approval_settings.sql`

Eklenen tablolar:
- `company_settings`
- `contract_approval_logs`

## 4) Gercek Urun Seviyesi Icin Onerilen Sonraki Isler

- Approval Queue sayfasi (pending_admin_approval filtreli kontrat listesi)
- SLA bazli hatirlatma (onay 24 saat gecerse eskalasyon)
- Retry + idempotency key (mail ve status degisimlerinde)
- Webhook ile ERP/CRM entegrasyonlari (SAP, Logo, Netsis vb.)
- Role matrix hardening (company_admin vs finance ayrimi, kapsam daraltma)
- KPI paneli: approval lead time, auto-renew success rate, rejection reason analytics

## 5) Operasyon Notu

Uretim ortami icin:
- Scheduler tek instance calismali (coklu backend pod varsa lider secimi gerekli).
- SMTP kimlik bilgileri ve Supabase servis key secret yonetiminde tutulmali.
- Migration uretime alinmadan once staging ortaminda test edilmelidir.

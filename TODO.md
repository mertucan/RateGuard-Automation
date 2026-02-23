# RateGuard - Geliştirme Planı (TODO)

## Aşama 1: Temel Arkayüz (Backend) Kurulumu ve Veri Çekme
- [x] TCMB EVDS API'sinden veri çekme scriptinin (`veri_cekme_tcmb.py`) düzenlenmesi.
- [x] Hassas verilerin (API Key) gizlenmesi için `.env` yapısına geçilmesi ve `.gitignore` dosyasının oluşturulması.
- [x] Kurulum talimatlarını içeren `Instructions.md` dosyasının oluşturulması.
- [ ] Backend API yapısının (Örn: Flask ile) ayağa kaldırılması.
- [ ] TCMB veri çekme scriptinin bir servis modülü (fonksiyon/API endpoint) haline getirilmesi.

## Aşama 2: Veri Tabanı ve Veri Modelleri
- [ ] Supabase/PostgreSQL projesinin oluşturulması.
- [ ] Gerekli tabloların (Müşteriler, Sözleşmeler, Finansal Veriler, vb.) tasarlanması.
- [ ] Python üzerinden Supabase'e veri yazma/okuma işlemlerinin (CRUD) entegre edilmesi.

## Aşama 3: Hesaplama ve PDF Üretimi
- [ ] Enflasyon ve kur verilerine göre sözleşme tutarı hesaplama logiciğinin oluşturulması.
- [ ] Hesaplanan tutarlar doğrultusunda ek sözleşme PDF belgelerinin kod ile otomatik üretilmesi (Örn: `reportlab` veya `pdfkit` kütüphaneleri ile).

## Aşama 4: Yapay Zeka (LLM) Entegrasyonu
- [ ] Gemini API entegrasyonunun yapılması.
- [ ] Müşteriye durumu izah edecek ve hazırlanan PDF'i sunacak profesyonel e-posta taslaklarının yapay zeka ile oluşturulması.

## Aşama 5: Önyüz (Frontend) Paneli
- [x] React (Vite) ile frontend projesinin başlatılması.
- [x] Dashboard, Renewal Review ve Client Management ekranlarının React sayfaları olarak eklenmesi.
- [ ] Yönetici paneli dashboard tasarımının ve grafiklerin (Recharts/Chart.js) entegrasyonu.
- [ ] Frontend - Backend API iletişiminin sağlanması.
- [ ] Müşteri ekleme, sözleşme takibi ve "Onay Bekleyenler" sayfalarının kodlanması.

## Aşama 6: Otomasyon ve Canlıya Alma
- [ ] Bitişine 30 gün kalan sözleşmeleri tespit edecek arka plan görevinin (cron job / Celery) yazılması.
- [ ] Sistemin bütün olarak uçtan uca test edilmesi.
- [ ] Projenin bulut ortamına (Vercel, Render, Heroku vb.) deploy edilmesi.

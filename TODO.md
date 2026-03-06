# RateGuard - Geliştirme Planı (TODO)

## Aşama 1: Temel Arkayüz (Backend) Kurulumu ve Veri Çekme
- [x] TCMB EVDS API'sinden veri çekme scriptinin (`veri_cekme_tcmb.py`) düzenlenmesi.
- [x] Hassas verilerin (API Key) gizlenmesi için `.env` yapısına geçilmesi ve `.gitignore` dosyasının oluşturulması.
- [x] Kurulum talimatlarını içeren `Instructions.md` dosyasının oluşturulması.
- [x] Backend API yapısının (Flask ile) ayağa kaldırılması.
- [x] TCMB veri çekme scriptinin bir servis modülü (fonksiyon/API endpoint) haline getirilmesi.

## Aşama 2: Veri Tabanı ve Veri Modelleri
- [x] Supabase/PostgreSQL projesinin oluşturulması.
- [x] Gerekli tabloların (Müşteriler, Sözleşmeler, Finansal Veriler, vb.) tasarlanması.
- [x] Python üzerinden Supabase'e veri yazma/okuma işlemlerinin (CRUD) entegre edilmesi.

## Aşama 3: Hesaplama ve PDF Üretimi
- [x] Enflasyon ve kur verilerine göre sözleşme tutarı hesaplama logiğinin oluşturulması.
- [x] Hesaplanan tutarlar doğrultusunda ek sözleşme PDF belgelerinin kod ile otomatik üretilmesi (`reportlab` kütüphanesi ile).

## Aşama 4: Yapay Zeka (LLM) Entegrasyonu
- [ ] Gemini API entegrasyonunun yapılması.
- [ ] Müşteriye durumu izah edecek ve hazırlanan PDF'i sunacak profesyonel e-posta taslaklarının yapay zeka ile oluşturulması.

## Aşama 5: Önyüz (Frontend) Paneli
- [x] React (Vite) ile frontend projesinin başlatılması.
- [x] Dashboard, Renewal Review ve Client Management ekranlarının React sayfaları olarak eklenmesi.
- [x] Yönetici paneli dashboard tasarımının ve grafiklerin (Recharts) entegrasyonu.
- [x] Frontend - Backend API iletişiminin sağlanması (Vite proxy + api.js).
- [x] Müşteri ekleme, sözleşme takibi ve "Onay Bekleyenler" sayfalarının kodlanması.
- [x] Karanlık mod (dark mode) desteği ve tema sistemi.
- [x] Analytics sayfası ile tarihsel veri görselleştirme (FX, enflasyon grafikleri).

## Aşama 6: Otomasyon ve Canlıya Alma
- [ ] Bitişine 30 gün kalan sözleşmeleri tespit edecek arka plan görevinin (cron job / Celery) yazılması.
- [ ] Sistemin bütün olarak uçtan uca test edilmesi.
- [ ] Projenin bulut ortamına (Vercel, Render, Heroku vb.) deploy edilmesi.

---

## Öneriler (Gelecek Geliştirmeler)

### Tamamlanan İyileştirmeler
- [x] **Hesaplama Kuralı Düzeltmesi**: Dashboard'da tüm sözleşmelerin TUFE+UFE ortalaması yerine, her sözleşmenin kendi `inflation_base_rule` kuralına göre hesaplanması.
- [x] **Pending Filtresi**: Dashboard ve backend'de onaylanmış/reddedilmiş sözleşmelerin "pending" listesinden çıkarılması.
- [x] **Email Composer Kontrollü State**: `defaultValue` yerine `value` + `onChange` ile e-posta içeriğinin güncel tutulması.
- [x] **Analytics Hata Durumları**: Boş veri veya API hatalarında kullanıcıya açıklayıcı mesajlar (ikon, başlık, çözüm önerisi).
- [x] **Client Management Silme Modalı**: Tarayıcının `confirm()` diyaloğu yerine özel tasarım silme onay penceresi ve toast bildirimleri.
- [x] **Mobil Uyumluluk**: Navbar hamburger menüsü, KPI kartları, tablolar ve formlar için responsive breakpoint'ler.
- [x] **Dosya Tabanlı Cache**: Flask debug/reload modunda in-memory cache sıfırlanma sorununu çözmek için `.cache/` dizinine JSON yedekleme.
- [x] **PDF Kaydedilmiş Değerler**: Draft/approved sözleşmelerde PDF'in canlı TCMB verisi yerine kaydedilmiş `new_amount` ve `applied_adjustment` değerlerini kullanması.

### Yüksek Öncelik
- [ ] **Bildirim Sistemi**: Sözleşme bitiş tarihi yaklaştığında e-posta ve/veya in-app bildirim gönderme (30/15/7 gün kala).
- [ ] **Kullanıcı Kimlik Doğrulama (Auth)**: Supabase Auth ile giriş/kayıt sistemi, roller (admin, manager, viewer) ve erişim kontrolü.
- [x] **Onay İş Akışı (Approval Workflow)**: Sözleşme yenileme sürecine çok aşamalı onay mekanizması (hesapla → taslak → yönetici onayı → müşteriye gönder).

### Orta Öncelik
- [ ] **Çoklu Döviz Desteği**: Sözleşmelerin USD, EUR veya TRY bazlı olabilmesi ve kur dönüşümlerinin otomatik hesaplanması.
- [ ] **Sözleşme Geçmişi & Versiyon Takibi**: Her yenileme döngüsünün kaydını tutarak fiyat değişim tarihçesini görselleştirme.
- [ ] **Dashboard Özelleştirme**: Kullanıcıların KPI kartlarını, grafikleri ve widget'ları sürükle-bırak ile düzenlemesi.
- [ ] **Toplu İşlem (Batch Operations)**: Birden fazla sözleşmeyi aynı anda seçip toplu PDF üretme ve toplu onay gönderme.
- [ ] **Dışa Aktarma (Export)**: Sözleşme listelerini ve analitik verilerini CSV/Excel formatında dışa aktarma.

### Düşük Öncelik / İleri Seviye
- [ ] **Çoklu Dil Desteği (i18n)**: Arayüzün Türkçe ve İngilizce arasında geçiş yapabilmesi.
- [ ] **Webhook Entegrasyonu**: Sözleşme durumu değiştiğinde harici sistemlere (Slack, Teams, CRM) otomatik bildirim.
- [ ] **Müşteri Portalı**: Müşterilerin kendi sözleşme durumlarını görebileceği salt okunur portal.
- [ ] **Gelişmiş Raporlama**: Aylık/çeyreklik otomatik rapor üretimi (toplam sözleşme değeri, ortalama artış, risk dağılımı).
- [ ] **API Rate Limiting & Logging**: Backend API'ye rate limiter ve yapılandırılmış loglama eklenmesi.
- [ ] **CI/CD Pipeline**: GitHub Actions ile otomatik test, lint ve deploy süreci.

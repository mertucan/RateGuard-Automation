# Proje Adı: Enflasyon Kalkanı

## Hakkında
Bu proje, şirketlerin yüksek enflasyonlu dönemlerde yaşadıkları sözleşme yenileme unutkanlıklarını, hesaplama hatalarını ve finansal kayıpları engellemek amacıyla geliştirilmiş otonom bir sözleşme yenileme sistemidir. İnsan müdahalesi gerektirmeyen, dış API'lerle haberleşen ve veri odaklı bir otomasyon mimarisine sahiptir.

## Fonksiyonel Özellikler
* Sistem, bitiş tarihine 30 gün kalmış sözleşmeleri otomatik olarak tespit eder.
* TCMB EVDS API üzerinden güncel döviz, TÜFE ve ÜFE oranlarını çeker.
* İlgili sözleşme kurallarına göre yeni fiyatı matematiksel olarak hesaplar.
* Yeni fiyat üzerinden hukuki geçerliliği olan bir ek sözleşme PDF belgesi oluşturur.
* Yapay zeka (LLM) entegrasyonu ile müşteriye durumu açıklayan profesyonel bir e-posta taslağı hazırlar.
* Hazırlanan bu paketi, onay için satış yöneticisine gönderir.

## Teknik Mimari ve Tasarım
Proje üç ana katmandan oluşmaktadır:
* Önyüz (Frontend): Kullanıcı etkileşimi için React kullanılarak tasarlanmış, grafikler ve tablolar içeren modern bir web panelidir.
* Arkayüz (Backend): TCMB ve Gemini API'leri ile entegre çalışan, iş mantığını yürüten Python ve Flask tabanlı otonom sunucu mimarisidir.
* Veri Tabanı: Supabase/PostgreSQL ilişkisel veri tabanı sistemi kullanılmaktadır.

## Veri Yapısı
Sistem aşağıdaki veri kategorileri ile işlem yapar:
* Müşteri Verileri: Unvan, yetkili iletişim bilgileri, risk skoru ve yapay zeka promptları için iletişim dili tercihleri.
* Finansal Veriler: Güncel kurlar ve aylık enflasyon endeksleri.
* Operasyonel Veriler: Onay bekleyen işlemler, bulut depolama bağlantıları ve yapay zeka metinleri.

## Kullanıcı Arayüzü
Yöneticiler için tasarlanmış kapsamlı dashboard şunları içerir:
* Yeni müşteri profili eklenebilen ve sözleşme detaylarının güncellenebildiği formlar.
* Hesaplamaları, PDF belgelerini ve e-posta taslaklarını listeleyen onay tabloları.
* Enflasyon trendlerini ve kur değişimlerini gösteren istatistiksel grafikler.
Sistem her sabah işlemleri tamamladığında web panelinde Onay Bekleyenler sekmesine bildirim gönderir ve tek bir Onayla ve Gönder butonuyla sürecin tamamlanmasını sağlar.

## Sistem ve Donanım Gereksinimleri
* Sunucu: Python 3.10+ ortamı, Supabase bağlantısı ve API erişimi için kesintisiz internet gereklidir. Arka plan işlemleri standart bulut sunucularında çalıştırılır.
* İstemci: Personelin internet bağlantısı ve güncel bir web tarayıcısı olan standart bir cihaz kullanması yeterlidir.
* Bulut tabanlı bir çözüm olduğundan fiziksel sensörlere veya ekstra dış donanıma ihtiyaç duymaz.

## Performans
Veri tabanı tarama, finansal verileri çekme, hesaplama, PDF oluşturma ve yapay zeka metin üretimi işlemleri tek bir sözleşme için minimum sürede tamamlanacak şekilde tasarlanmıştır.
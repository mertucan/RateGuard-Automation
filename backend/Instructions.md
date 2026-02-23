# RateGuard - Kurulum ve Başlangıç Rehberi

Bu rehber, projenin geliştirme ortamını hazırlamak için gereken adımları içerir.

## 1. Gereksinimler
- Python 3.10 veya üzeri
- Node.js (Frontend için, henüz kurulmadıysa 18+ sürümü önerilir)
- Git

## 2. Arkayüz (Backend) Kurulumu

### Python Sanal Ortamını Oluşturma
Terminali açın ve proje dizininde aşağıdaki komutları çalıştırarak sanal ortam (virtual environment) oluşturun:

```bash
python -m venv venv
```

### Sanal Ortamı Aktif Etme
- **Windows için (PowerShell):**
  ```bash
  .\venv\Scripts\Activate.ps1
  ```
- **Mac/Linux için:**
  ```bash
  source venv/bin/activate
  ```

### Gerekli Kütüphanelerin Kurulumu
Şu an için kullanılan kütüphaneleri yükleyin:
```bash
pip install requests python-dotenv
```
*(İlerleyen aşamalarda `Flask`, `Supabase`, yapay zeka entegrasyonları için diğer kütüphaneleri de buraya ekleyeceğiz)*

### Çevresel Değişkenleri (API Anahtarlarını) Ayarlama
1. Proje ana dizininde bulunan `.env.example` dosyasının bir kopyasını oluşturup adını `.env` yapın.
2. Oluşturduğunuz `.env` dosyasının içindeki `TCMB_API_KEY` değerine EVDS'den aldığınız kendi API anahtarınızı yapıştırın.
*Not: `.env` dosyası `.gitignore`'a eklendiği için GitHub'a gönderilmeyecektir, bu nedenle anahtarlarınız güvendedir.*

### Scripti Test Etme
Aşağıdaki komutla veri çekme scriptinin düzgün çalışıp çalışmadığını test edebilirsiniz:
```bash
python veri_cekme_tcmb.py
```

---

## 3. Önyüz (Frontend) ve Veri Tabanı (Gelecek Adımlar)
*Frontend (React) kurulumu ve Supabase veri tabanı bağlantıları, projede ilerledikçe bu dosyada güncellenecektir.*

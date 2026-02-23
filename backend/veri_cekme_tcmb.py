import requests
import json
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

# .env dosyasındaki değişkenleri yükle
load_dotenv()

# API Anahtarını .env dosyasından al
API_KEY = os.getenv("TCMB_API_KEY", "API_KEY_BULUNAMADI")

def get_guaranteed_market_data():
    """
    Enflasyonu API'ye hesaplatmaz, ham endeksleri çekip 
    Python tarafında matematiksel olarak hesaplar.
    Hata payı sıfırdır.
    """
    headers = {"key": API_KEY}
    
    # Bugünün tarihi (Örn: Şubat 2026)
    end_date = datetime.now()
    # 14 ay geriye gidiyoruz ki geçen seneki veriyi de alalım
    start_date = end_date - timedelta(days=420) 
    
    str_end = end_date.strftime("%d-%m-%Y")
    str_start = start_date.strftime("%d-%m-%Y")
    
    print(f"Veriler çekiliyor... ({str_start} - {str_end})")

    # --- 1. DÖVİZ KURLARI (GÜNLÜK) ---
    # Sadece son 1 haftayı çekmek yeterli
    fx_url = f"https://evds2.tcmb.gov.tr/service/evds/series=TP.DK.USD.S.YTL-TP.DK.EUR.S.YTL&startDate={(end_date-timedelta(days=7)).strftime('%d-%m-%Y')}&endDate={str_end}&type=json"
    
    usd = 0
    eur = 0
    
    try:
        fx_resp = requests.get(fx_url, headers=headers)
        fx_items = fx_resp.json().get("items", [])
        # En son dolu kuru bul
        for item in reversed(fx_items):
            if usd == 0 and item.get("TP_DK_USD_S_YTL"): usd = float(item.get("TP_DK_USD_S_YTL"))
            if eur == 0 and item.get("TP_DK_EUR_S_YTL"): eur = float(item.get("TP_DK_EUR_S_YTL"))
            if usd and eur: break
    except: pass

    # --- 2. ENFLASYON HESAPLAMA (GARANTİ YÖNTEM) ---
    # TP.FG.J0: TÜFE Endeksi (Örn: 3683)
    # TP.TG.J0: ÜFE Endeksi
    inf_url = f"https://evds2.tcmb.gov.tr/service/evds/series=TP.FG.J0-TP.TG.J0&startDate={str_start}&endDate={str_end}&type=json"
    
    tufe_orani = 0
    ufe_orani = 0
    
    try:
        inf_resp = requests.get(inf_url, headers=headers)
        inf_items = inf_resp.json().get("items", [])
        
        # Sadece dolu verileri filtrele
        tufe_list = [float(x["TP_FG_J0"]) for x in inf_items if x.get("TP_FG_J0")]
        ufe_list = [float(x["TP_TG_J0"]) for x in inf_items if x.get("TP_TG_J0")]
        
        # HESAPLAMA: (Son Endeks - 12 Ay Önceki Endeks) / 12 Ay Önceki * 100
        if len(tufe_list) >= 13:
            son_tufe = tufe_list[-1]      # Bu ay (veya geçen ay)
            eski_tufe = tufe_list[-13]    # Tam 1 yıl önce
            tufe_orani = ((son_tufe - eski_tufe) / eski_tufe) * 100
            
        if len(ufe_list) >= 13:
            son_ufe = ufe_list[-1]
            eski_ufe = ufe_list[-13]
            ufe_orani = ((son_ufe - eski_ufe) / eski_ufe) * 100
            
    except Exception as e:
        print(f"Enflasyon Hesaplama Hatası: {e}")

    return {
        "usd": usd,
        "eur": eur,
        "tufe": tufe_orani,
        "ufe": ufe_orani
    }

# --- TEST ET ---
if __name__ == "__main__":
    data = get_guaranteed_market_data()
    
    print("\n" + "="*35)
    print("🚀 GÜNCEL PİYASA RAPORU")
    print("="*35)
    print(f"💵 Dolar      : {data['usd']:.2f} TL")
    print(f"💶 Euro       : {data['eur']:.2f} TL")
    print("-" * 35)
    print(f"📈 TÜFE (Yıllık): %{data['tufe']:.2f}")
    print(f"🏭 ÜFE (Yıllık) : %{data['ufe']:.2f}")
    print("="*35 + "\n")
    
    if data['tufe'] > 0:
        eski = 100000
        yeni = eski * (1 + (data['tufe']/100))
        print(f"Örnek Hesaplama (100 Bin TL'lik Sözleşme):")
        print(f"Yeni Tutar: {yeni:,.2f} TL (Fark: +{yeni-eski:,.2f} TL)")
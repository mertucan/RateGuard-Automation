import requests
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

API_KEY = os.getenv("TCMB_API_KEY", "")

EVDS_BASE = "https://evds3.tcmb.gov.tr/igmevdsms-dis/"


def _evds_get(url, label=""):
    headers = {"key": API_KEY}
    try:
        resp = requests.get(url, headers=headers, timeout=20, allow_redirects=False)
        if resp.status_code != 200:
            print(f"[EVDS {label}] HTTP {resp.status_code}: {resp.text[:300]}")
            return []
        body = resp.text.strip()
        if not body:
            print(f"[EVDS {label}] Bos yanit")
            return []
        data = resp.json()
        items = data.get("items", [])
        print(f"[EVDS {label}] {len(items)} kayit cekildi")
        return items
    except requests.exceptions.Timeout:
        print(f"[EVDS {label}] Timeout (20s)")
        return []
    except Exception as e:
        print(f"[EVDS {label}] Hata: {e}")
        return []


def _extract_float_list(items, field):
    return [float(x[field]) for x in items if x.get(field)]


def _yoy_rate(values):
    """13+ aylik endeks listesinden yillik degisim orani hesaplar."""
    if len(values) >= 13:
        return ((values[-1] - values[-13]) / values[-13]) * 100
    return 0.0


def get_guaranteed_market_data():
    """
    TCMB EVDS 3'ten doviz kuru ve enflasyon endekslerini ceker,
    yillik enflasyonu Python tarafinda hesaplar.
    """
    end_date = datetime.now()
    str_end = end_date.strftime("%d-%m-%Y")
    str_fx_start = (end_date - timedelta(days=14)).strftime("%d-%m-%Y")
    str_inf_start = (end_date - timedelta(days=480)).strftime("%d-%m-%Y")

    print(f"Veriler cekiliyor... ({str_inf_start} - {str_end})")

    # --- 1. DOVIZ KURLARI (son 2 hafta) ---
    fx_url = (
        f"{EVDS_BASE}series=TP.DK.USD.S.YTL-TP.DK.EUR.S.YTL"
        f"&startDate={str_fx_start}&endDate={str_end}&type=json"
    )
    usd = 0.0
    eur = 0.0
    for item in reversed(_evds_get(fx_url, "FX")):
        if usd == 0 and item.get("TP_DK_USD_S_YTL"):
            usd = float(item["TP_DK_USD_S_YTL"])
        if eur == 0 and item.get("TP_DK_EUR_S_YTL"):
            eur = float(item["TP_DK_EUR_S_YTL"])
        if usd and eur:
            break

    time.sleep(0.5)

    # --- 2. TUFE / CPI endeksi (TP.FG.J0) ---
    tufe_url = (
        f"{EVDS_BASE}series=TP.FG.J0"
        f"&startDate={str_inf_start}&endDate={str_end}&type=json"
    )
    tufe_orani = _yoy_rate(_extract_float_list(_evds_get(tufe_url, "TUFE"), "TP_FG_J0"))

    time.sleep(0.5)

    # --- 3. UFE / PPI endeksi (TP.TUFE1YI.T1 = Yurt Ici Uretici Fiyat Genel) ---
    ufe_url = (
        f"{EVDS_BASE}series=TP.TUFE1YI.T1"
        f"&startDate={str_inf_start}&endDate={str_end}&type=json"
    )
    ufe_orani = _yoy_rate(_extract_float_list(_evds_get(ufe_url, "UFE"), "TP_TUFE1YI_T1"))

    print(f"Sonuc: USD={usd}, EUR={eur}, TUFE=%{tufe_orani:.2f}, UFE=%{ufe_orani:.2f}")

    return {
        "usd": usd,
        "eur": eur,
        "tufe": tufe_orani,
        "ufe": ufe_orani,
    }


if __name__ == "__main__":
    data = get_guaranteed_market_data()

    print("\n" + "=" * 35)
    print("GUNCEL PIYASA RAPORU")
    print("=" * 35)
    print(f"Dolar      : {data['usd']:.2f} TL")
    print(f"Euro       : {data['eur']:.2f} TL")
    print("-" * 35)
    print(f"TUFE (Yillik): %{data['tufe']:.2f}")
    print(f"UFE (Yillik) : %{data['ufe']:.2f}")
    print("=" * 35 + "\n")

    if data["tufe"] > 0:
        eski = 100000
        yeni = eski * (1 + (data["tufe"] / 100))
        print(f"Ornek Hesaplama (100 Bin TL'lik Sozlesme):")
        print(f"Yeni Tutar: {yeni:,.2f} TL (Fark: +{yeni - eski:,.2f} TL)")

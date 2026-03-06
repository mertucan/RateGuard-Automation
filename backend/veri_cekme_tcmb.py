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


def get_historical_data(days=90):
    """
    Belirli bir gun araligi icin doviz kuru ve enflasyon endeks
    zaman serilerini dondurur (grafik icin).
    """
    end_date = datetime.now()
    str_end = end_date.strftime("%d-%m-%Y")
    str_start = (end_date - timedelta(days=days)).strftime("%d-%m-%Y")
    str_inf_start = (end_date - timedelta(days=max(days, 480))).strftime("%d-%m-%Y")

    # FX daily data
    fx_url = (
        f"{EVDS_BASE}series=TP.DK.USD.S.YTL-TP.DK.EUR.S.YTL"
        f"&startDate={str_start}&endDate={str_end}&type=json"
    )
    fx_items = _evds_get(fx_url, "FX-HIST")

    fx_series = []
    for item in fx_items:
        usd_val = item.get("TP_DK_USD_S_YTL")
        eur_val = item.get("TP_DK_EUR_S_YTL")
        if usd_val or eur_val:
            fx_series.append({
                "date": item.get("Tarih", ""),
                "usd": float(usd_val) if usd_val else None,
                "eur": float(eur_val) if eur_val else None,
            })

    time.sleep(0.5)

    # TUFE monthly index
    tufe_url = (
        f"{EVDS_BASE}series=TP.FG.J0"
        f"&startDate={str_inf_start}&endDate={str_end}&type=json"
    )
    tufe_items = _evds_get(tufe_url, "TUFE-HIST")

    time.sleep(0.5)

    # UFE monthly index
    ufe_url = (
        f"{EVDS_BASE}series=TP.TUFE1YI.T1"
        f"&startDate={str_inf_start}&endDate={str_end}&type=json"
    )
    ufe_items = _evds_get(ufe_url, "UFE-HIST")

    tufe_values = []
    for item in tufe_items:
        val = item.get("TP_FG_J0")
        if val:
            tufe_values.append({"date": item.get("Tarih", ""), "value": float(val)})

    ufe_values = []
    for item in ufe_items:
        val = item.get("TP_TUFE1YI_T1")
        if val:
            ufe_values.append({"date": item.get("Tarih", ""), "value": float(val)})

    # YoY rates from indices
    inflation_series = []
    tufe_list = [v["value"] for v in tufe_values]
    ufe_list = [v["value"] for v in ufe_values]

    for i in range(12, len(tufe_values)):
        t_rate = ((tufe_list[i] - tufe_list[i - 12]) / tufe_list[i - 12]) * 100
        u_rate = 0
        if i < len(ufe_list) and (i - 12) >= 0:
            u_rate = ((ufe_list[i] - ufe_list[i - 12]) / ufe_list[i - 12]) * 100
        inflation_series.append({
            "date": tufe_values[i]["date"],
            "tufe": round(t_rate, 2),
            "ufe": round(u_rate, 2),
        })

    return {
        "fx": fx_series,
        "inflation": inflation_series,
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

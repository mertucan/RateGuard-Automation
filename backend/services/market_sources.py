import re
from datetime import date, datetime, timedelta

import requests

from config import (
    PRIVATE_SECTOR_INFLATION_EXPECTATION_SERIES,
    PRIVATE_SECTOR_INFLATION_EXPECTATION_URL,
    TCMB_API_KEY,
    WORLD_BANK_TURKEY_CPI_INDEX_URL,
    WORLD_BANK_TURKEY_INFLATION_URL,
    WORLD_BANK_TURKEY_WPI_URL,
)
from veri_cekme_tcmb import EVDS_BASE, get_guaranteed_market_data


SOURCE_META = {
    "tcmb_evds": {
        "key": "tcmb_evds",
        "name": "TCMB EVDS",
        "institution": "Central Bank of the Republic of Turkiye (TCMB)",
        "method": "Official EVDS API",
        "description": "CPI and domestic producer price index series are pulled from TCMB EVDS and converted to annual rates.",
    },
    "world_bank": {
        "key": "world_bank",
        "name": "World Bank",
        "institution": "World Bank",
        "method": "World Bank API (v2)",
        "description": "Annual CPI inflation (%) and CPI/WPI index series are pulled from the World Bank API.",
    },
    "private_sector_expectations": {
        "key": "private_sector_expectations",
        "name": "Private Sector Expectations",
        "institution": "TCMB Survey of Market Participants",
        "method": "Latest 12-month-ahead annual CPI expectation, arithmetic mean",
        "description": "The app pulls the TCMB Survey of Market Participants series TP.BEK.S01.E.A from EVDS and uses the latest numeric value as the private-sector CPI expectation. This source does not provide a PPI expectation.",
        "supports_ufe": False,
    },
}


def available_sources():
    # TÜİK & Trading Economics intentionally removed (user request).
    return [
        SOURCE_META["tcmb_evds"],
        SOURCE_META["world_bank"],
        SOURCE_META["private_sector_expectations"],
    ]


def normalize_source(source):
    source = (source or "tcmb_evds").strip().lower()
    aliases = {
        "tcmb": "tcmb_evds",
        "evds": "tcmb_evds",
        "worldbank": "world_bank",
        "wb": "world_bank",
        "private_sector": "private_sector_expectations",
        "private_sector_expectation": "private_sector_expectations",
        "market_participants": "private_sector_expectations",
        "piyasa_katilimcilari": "private_sector_expectations",
        "piyasa_katilimcilari_anketi": "private_sector_expectations",
        # Back-compat: any old saved value falls back to EVDS.
        "tuik": "tcmb_evds",
        "turkstat": "tcmb_evds",
        "tuik_portal": "tcmb_evds",
        "trading_economics": "tcmb_evds",
        "te": "tcmb_evds",
    }
    source = aliases.get(source, source)
    return source if source in SOURCE_META else "tcmb_evds"


def get_market_data_from_source(source=None):
    source = normalize_source(source)
    if source == "world_bank":
        return _with_meta(_fetch_world_bank(), source)
    if source == "private_sector_expectations":
        return _with_meta(_fetch_private_sector_expectation(), source)
    return _with_meta(get_guaranteed_market_data(), "tcmb_evds")


def _with_meta(data, source):
    meta = SOURCE_META[source]
    out = dict(data or {})
    out.setdefault("usd", 0)
    out.setdefault("eur", 0)
    out["tufe"] = round(_num(out.get("tufe")), 2)
    out["ufe"] = round(_num(out.get("ufe")), 2)
    out["source_key"] = meta["key"]
    out["source_name"] = meta["name"]
    out["source_institution"] = meta["institution"]
    out["source_method"] = meta["method"]
    out["source_description"] = meta.get("description", "")
    out["data_source"] = meta
    out["supports_ufe"] = meta.get("supports_ufe", True)
    out["as_of"] = out.get("as_of") or date.today().isoformat()
    return out


def _fetch_private_sector_expectation():
    if PRIVATE_SECTOR_INFLATION_EXPECTATION_URL:
        latest = _latest_numeric_from_url(
            PRIVATE_SECTOR_INFLATION_EXPECTATION_URL,
            "TCMB Survey of Market Participants CPI expectation",
        )
        return {
            "tufe": float(latest),
            "ufe": 0,
            "usd": 0,
            "eur": 0,
            "as_of": date.today().isoformat(),
        }

    series = (PRIVATE_SECTOR_INFLATION_EXPECTATION_SERIES or "").strip()
    if not series:
        raise RuntimeError(
            "PRIVATE_SECTOR_INFLATION_EXPECTATION_SERIES must be configured to use the private-sector expectation source."
        )
    if not TCMB_API_KEY:
        raise RuntimeError(
            "TCMB_API_KEY must be configured to use the TCMB Survey of Market Participants source."
        )

    end = date.today()
    start = end - timedelta(days=460)
    url = (
        f"{EVDS_BASE}series={series}"
        f"&startDate={start.strftime('%d-%m-%Y')}"
        f"&endDate={end.strftime('%d-%m-%Y')}&type=json"
    )
    data = _get_tcmb_json(url, "TCMB Survey of Market Participants CPI expectation")
    items = data.get("items", []) if isinstance(data, dict) else []
    field = series.replace(".", "_")
    latest = None
    latest_date = None
    for item in items:
        if not isinstance(item, dict):
            continue
        parsed = _try_float(item.get(field))
        if parsed is None:
            continue
        latest = parsed
        latest_date = _parse_evds_date(item.get("Tarih"))
    if latest is None:
        raise RuntimeError(
            f"TCMB Survey of Market Participants response did not include a numeric value for {series}."
        )
    return {
        "tufe": float(latest),
        "ufe": 0,
        "usd": 0,
        "eur": 0,
        "as_of": latest_date or date.today().isoformat(),
    }


def _fetch_world_bank():
    inflation = None
    if WORLD_BANK_TURKEY_INFLATION_URL:
        inflation = _world_bank_latest_value(
            WORLD_BANK_TURKEY_INFLATION_URL, "World Bank CPI inflation (%)"
        )
    elif WORLD_BANK_TURKEY_CPI_INDEX_URL:
        cpi_series = _world_bank_series(WORLD_BANK_TURKEY_CPI_INDEX_URL, "World Bank CPI index")
        if len(cpi_series) >= 2 and cpi_series[-2][1]:
            y2, v2 = cpi_series[-1]
            y1, v1 = cpi_series[-2]
            inflation = {"year": y2, "value": ((v2 - v1) / v1) * 100}
    if inflation is None:
        raise RuntimeError(
            "WORLD_BANK_TURKEY_INFLATION_URL (or WORLD_BANK_TURKEY_CPI_INDEX_URL) must be configured to use the World Bank source."
        )

    wpi_yoy = 0.0
    as_of_year = inflation.get("year")
    if WORLD_BANK_TURKEY_WPI_URL:
        wpi_series = _world_bank_series(WORLD_BANK_TURKEY_WPI_URL, "World Bank WPI index")
        if len(wpi_series) >= 2 and wpi_series[-2][1]:
            y2, v2 = wpi_series[-1]
            y1, v1 = wpi_series[-2]
            wpi_yoy = ((v2 - v1) / v1) * 100
            as_of_year = as_of_year or y2

    as_of = f"{int(as_of_year):04d}-12-31" if as_of_year else date.today().isoformat()
    return {
        "tufe": float(inflation.get("value") or 0.0),
        "ufe": float(wpi_yoy or 0.0),
        "usd": 0,
        "eur": 0,
        "as_of": as_of,
    }


def _world_bank_series(url, label):
    payload = _get_json(url, label)
    if not isinstance(payload, list) or len(payload) < 2 or not isinstance(payload[1], list):
        return []
    rows = payload[1]
    out = []
    for row in rows:
        if not isinstance(row, dict):
            continue
        year_raw = row.get("date")
        try:
            year = int(str(year_raw).strip())
        except Exception:
            continue
        val = _try_float(row.get("value"))
        if val is None:
            continue
        out.append((year, float(val)))
    out.sort(key=lambda x: x[0])
    return out


def _world_bank_latest_value(url, label):
    series = _world_bank_series(url, label)
    if not series:
        raise RuntimeError(f"{label} response did not include a numeric value.")
    year, val = series[-1]
    return {"year": year, "value": float(val)}


def _latest_numeric_from_url(url, label):
    data = _get_json(url, label)
    values = list(_walk_numbers(data))
    if not values:
        raise RuntimeError(f"{label} response did not include a numeric value.")
    return values[-1]


def _get_json(url, label):
    try:
        response = requests.get(url, timeout=25)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise RuntimeError(f"{label} fetch failed: {exc}") from exc


def _get_tcmb_json(url, label):
    try:
        response = requests.get(url, headers={"key": TCMB_API_KEY}, timeout=25)
        response.raise_for_status()
        return response.json()
    except Exception as exc:
        raise RuntimeError(f"{label} fetch failed: {exc}") from exc


def _parse_evds_date(value):
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%Y-%m"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            pass
    return text


def _walk_numbers(value):
    if isinstance(value, dict):
        for key, item in value.items():
            if str(key).lower() in {"year", "month", "period", "date", "tarih"}:
                continue
            yield from _walk_numbers(item)
    elif isinstance(value, list):
        for item in value:
            yield from _walk_numbers(item)
    else:
        parsed = _try_float(value)
        if parsed is not None:
            yield parsed


def _try_float(value):
    if value is None or value == "":
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace("%", "")
    if not text:
        return None
    text = re.sub(r"[^0-9,.\-]", "", text)
    if "," in text and "." not in text:
        text = text.replace(",", ".")
    elif "," in text and "." in text:
        text = text.replace(",", "")
    try:
        return float(text)
    except ValueError:
        return None


def _num(value):
    parsed = _try_float(value)
    return parsed if parsed is not None else 0.0

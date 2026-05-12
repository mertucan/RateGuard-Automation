import json
import os
import time
from pathlib import Path
from services.market_sources import get_market_data_from_source, normalize_source
from veri_cekme_tcmb import get_historical_data

_cache = {}
CACHE_TTL = 300  # 5 minutes

_history_cache = {}
HISTORY_TTL = 1800  # 30 minutes

CACHE_DIR = Path(__file__).resolve().parent.parent / ".cache"


def _ensure_cache_dir():
    CACHE_DIR.mkdir(exist_ok=True)


def _read_file_cache(name):
    path = CACHE_DIR / f"{name}.json"
    if not path.exists():
        return None
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
        if time.time() - raw.get("ts", 0) < raw.get("ttl", 0):
            return raw["data"]
    except Exception:
        pass
    return None


def _write_file_cache(name, data, ttl):
    _ensure_cache_dir()
    path = CACHE_DIR / f"{name}.json"
    try:
        path.write_text(
            json.dumps({"data": data, "ts": time.time(), "ttl": ttl}),
            encoding="utf-8",
        )
    except Exception:
        pass


def get_cached_market_data(source=None):
    source = normalize_source(source)
    now = time.time()
    entry = _cache.get(source)
    if entry and (now - entry["ts"]) < CACHE_TTL:
        return entry["data"]

    file_data = _read_file_cache(f"market_{source}")
    if file_data:
        _cache[source] = {"data": file_data, "ts": now}
        return file_data

    data = get_market_data_from_source(source)
    _cache[source] = {"data": data, "ts": now}
    _write_file_cache(f"market_{source}", data, CACHE_TTL)
    return data


def get_cached_history(days):
    now = time.time()
    key = str(days)
    entry = _history_cache.get(key)
    if entry and (now - entry["ts"]) < HISTORY_TTL:
        return entry["data"]

    file_data = _read_file_cache(f"history_{key}")
    if file_data:
        _history_cache[key] = {"data": file_data, "ts": now}
        return file_data

    data = get_historical_data(days)
    _history_cache[key] = {"data": data, "ts": now}
    _write_file_cache(f"history_{key}", data, HISTORY_TTL)
    return data

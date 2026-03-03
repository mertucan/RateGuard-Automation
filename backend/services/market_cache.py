import time
from veri_cekme_tcmb import get_guaranteed_market_data

_cache = {"data": None, "ts": 0}
CACHE_TTL = 300  # 5 dakika


def get_cached_market_data():
    """TCMB verisini 5 dakikalik cache ile dondurur."""
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_TTL:
        return _cache["data"]

    data = get_guaranteed_market_data()
    _cache["data"] = data
    _cache["ts"] = now
    return data

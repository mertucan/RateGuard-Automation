from datetime import date
from services.supabase_client import supabase
from services.market_cache import get_cached_market_data


def calculate_renewal(contract_id):
    """
    Belirli bir sozlesme icin enflasyon/kur verileriyle
    yeni fiyat hesaplar ve detayli sonuc dondurur.
    Draft/approved sozlesmelerde kaydedilmis degerleri kullanir.
    """
    result = (
        supabase.table("contracts")
        .select("*, companies!contracts_company_id_fkey(company_name, authorized_email, communication_language)")
        .eq("id", contract_id)
        .limit(1)
        .execute()
    )
    contract = result.data[0] if result.data else None
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    company = contract.get("companies", {}) or {}
    source_key = contract.get("inflation_data_source") or "tcmb_evds"
    try:
        market = get_cached_market_data(source_key)
    except Exception as exc:
        print(f"[calculation] Market source {source_key} failed: {exc}. Falling back to TCMB EVDS.")
        source_key = "tcmb_evds"
        market = get_cached_market_data(source_key)

    amount = _to_float(contract.get("previous_amount"), 0)
    tufe = _to_float(market.get("tufe"), 0)
    ufe = _to_float(market.get("ufe"), 0)
    rule = contract.get("inflation_base_rule", "TUFE")
    if market.get("supports_ufe") is False and rule in ("UFE", "TUFE+UFE"):
        rule = "TUFE"
    max_limit = contract.get("max_increase_limit")
    max_limit_num = _to_float(max_limit, None)
    status = contract.get("status", "active")

    has_saved = status in ("draft", "approved") and contract.get("new_amount") is not None

    if has_saved:
        new_amount = contract["new_amount"]
        adjustment = contract.get("applied_adjustment", 0) or 0
        difference = new_amount - amount
        capped = max_limit is not None and adjustment < _raw_adjustment(tufe, ufe, rule)
    else:
        if rule == "CUSTOM":
            adjustment = max_limit_num or 0
        elif rule == "TUFE":
            adjustment = tufe
        elif rule == "UFE":
            adjustment = ufe
        else:
            adjustment = (tufe + ufe) / 2

        capped = False
        if rule != "CUSTOM" and max_limit_num is not None and adjustment > max_limit_num:
            adjustment = max_limit_num
            capped = True

        new_amount = amount * (1 + adjustment / 100)
        difference = new_amount - amount

    return {
        "contract_id": contract_id,
        "company_name": company.get("company_name", ""),
        "company_email": company.get("authorized_email", ""),
        "language": company.get("communication_language", "professional"),
        "end_date": contract.get("end_date", ""),
        "inflation_base_rule": rule,
        "max_increase_limit": max_limit,
        "inflation_data_source": source_key,
        "inflation_source_name": contract.get("inflation_source_name") or market.get("source_name", "TCMB EVDS"),
        "inflation_source_institution": contract.get("inflation_source_institution") or market.get("source_institution", ""),
        "inflation_source_method": contract.get("inflation_source_method") or market.get("source_method", ""),
        "inflation_source_description": market.get("source_description", ""),
        "supports_ufe": market.get("supports_ufe", True),
        "previous_amount": round(amount, 2),
        "currency": contract.get("currency", "TRY"),
        "contract_type": contract.get("contract_type", "service_contract"),
        "tufe_rate": round(tufe, 2),
        "ufe_rate": round(ufe, 2),
        "applied_adjustment": round(adjustment, 2),
        "capped": capped,
        "new_amount": round(new_amount, 2),
        "difference": round(difference, 2),
        "usd_rate": market.get("usd", 0),
        "eur_rate": market.get("eur", 0),
        "calculation_date": date.today().isoformat(),
        "uses_saved_values": has_saved,
    }


def _raw_adjustment(tufe, ufe, rule):
    if rule == "CUSTOM":
        return 0
    if rule == "TUFE":
        return tufe
    elif rule == "UFE":
        return ufe
    return (tufe + ufe) / 2


def _to_float(value, default=0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

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
        .single()
        .execute()
    )
    contract = result.data
    if not contract:
        raise ValueError(f"Contract {contract_id} not found")

    company = contract.get("companies", {}) or {}
    market = get_cached_market_data()

    amount = contract.get("previous_amount", 0) or 0
    tufe = market.get("tufe", 0)
    ufe = market.get("ufe", 0)
    rule = contract.get("inflation_base_rule", "TUFE")
    max_limit = contract.get("max_increase_limit")
    status = contract.get("status", "active")

    has_saved = status in ("draft", "approved") and contract.get("new_amount") is not None

    if has_saved:
        new_amount = contract["new_amount"]
        adjustment = contract.get("applied_adjustment", 0) or 0
        difference = new_amount - amount
        capped = max_limit is not None and adjustment < _raw_adjustment(tufe, ufe, rule)
    else:
        if rule == "TUFE":
            adjustment = tufe
        elif rule == "UFE":
            adjustment = ufe
        else:
            adjustment = (tufe + ufe) / 2

        capped = False
        if max_limit and adjustment > max_limit:
            adjustment = max_limit
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
    if rule == "TUFE":
        return tufe
    elif rule == "UFE":
        return ufe
    return (tufe + ufe) / 2

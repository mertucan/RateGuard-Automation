from datetime import date, timedelta
from flask import Blueprint, jsonify, request
from services.supabase_client import supabase
from services.market_cache import get_cached_market_data, get_cached_history
from veri_cekme_tcmb import get_guaranteed_market_data

market_data_bp = Blueprint("market_data", __name__)


@market_data_bp.route("/api/market-data", methods=["GET"])
def get_market_data():
    return jsonify(get_cached_market_data())


@market_data_bp.route("/api/market-data/history", methods=["GET"])
def get_market_history():
    period = request.args.get("period", "90")
    try:
        days = int(period)
    except ValueError:
        days = 90
    data = get_cached_history(days)
    return jsonify(data)


@market_data_bp.route("/api/market-data/save", methods=["POST"])
def save_market_data():
    data = get_guaranteed_market_data()
    row = {
        "record_date": date.today().isoformat(),
        "exchange_rate": data["usd"],
        "tufe_data": round(data["tufe"], 2),
        "ufe_data": round(data["ufe"], 2),
    }
    result = supabase.table("financial_logs").insert(row).execute()
    return jsonify(result.data[0]), 201


@market_data_bp.route("/api/dashboard/stats", methods=["GET"])
def dashboard_stats():
    today = date.today()
    t30 = (today + timedelta(days=30)).isoformat()
    t60 = (today + timedelta(days=60)).isoformat()
    today_s = today.isoformat()
    tenant_company_id = request.args.get("tenant_company_id")

    try:
        query = supabase.table("contracts").select("id, end_date, previous_amount, status")
        if tenant_company_id:
            query = query.eq("tenant_company_id", tenant_company_id)
        contracts = query.execute().data or []
    except Exception:
        contracts = []

    active_contracts = [
        c for c in contracts
        if c.get("status", "active") not in ("approved", "rejected")
    ]

    expiring_30 = [c for c in active_contracts if c.get("end_date") and today_s <= c["end_date"] <= t30]
    pending = [c for c in active_contracts if c.get("end_date") and today_s <= c["end_date"] <= t60]

    market = get_cached_market_data()
    tufe = market.get("tufe", 0)
    ufe = market.get("ufe", 0)
    avg_adjustment = round((tufe + ufe) / 2, 1) if (tufe or ufe) else 0

    return jsonify({
        "expiring_30": len(expiring_30),
        "pending_approvals": len(pending),
        "avg_adjustment": avg_adjustment,
        "tufe": round(tufe, 2),
        "ufe": round(ufe, 2),
        "usd": market.get("usd", 0),
        "eur": market.get("eur", 0),
    })

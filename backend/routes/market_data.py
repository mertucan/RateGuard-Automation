from datetime import date, timedelta
from flask import Blueprint, jsonify, request, g
from services.supabase_client import supabase
from services.auth_middleware import login_required, role_required
from services.market_cache import get_cached_market_data, get_cached_history
from services.market_sources import available_sources
from veri_cekme_tcmb import get_guaranteed_market_data

market_data_bp = Blueprint("market_data", __name__)


@market_data_bp.route("/api/market-data", methods=["GET"])
def get_market_data():
    source = request.args.get("source")
    try:
        return jsonify(get_cached_market_data(source))
    except Exception as e:
        print(f"[market-data] Error: {e}")
        return jsonify({"error": str(e)}), 400


@market_data_bp.route("/api/market-data/sources", methods=["GET"])
def get_market_sources():
    return jsonify(available_sources())


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
@role_required("super_admin", "company_admin", "finance")
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
@login_required
def dashboard_stats():
    user = g.current_user
    today = date.today()
    t30 = (today + timedelta(days=30)).isoformat()
    t60 = (today + timedelta(days=60)).isoformat()
    today_s = today.isoformat()
    tenant_company_id = request.args.get("tenant_company_id")
    period_days_raw = request.args.get("period_days")
    period_days = None
    try:
        if period_days_raw is not None and str(period_days_raw).strip() != "":
            period_days = int(period_days_raw)
            if period_days <= 0:
                period_days = None
    except (TypeError, ValueError):
        period_days = None

    try:
        base_select = (
            "id, end_date, previous_amount, status, "
            "companies!contracts_company_id_fkey(company_name)"
        )
        extended_select = (
            "id, end_date, previous_amount, status, new_amount, approved_at, "
            "companies!contracts_company_id_fkey(company_name)"
        )

        query = supabase.table("contracts").select(extended_select)
        
        # Enforce security filtering based on user role
        if user["role"] in ["company_admin", "finance", "sales"]:
            company_scope = user["company_id"]
            query = query.or_(
                f"tenant_company_id.eq.{company_scope},company_id.eq.{company_scope}"
            )
        elif user["role"] == "user":
            query = query.eq("company_id", user["company_id"])
        elif user["role"] == "hr":
            return jsonify({
                "expiring_30": 0,
                "pending_approvals": 0,
                "avg_adjustment": 0,
                "tufe": 0,
                "ufe": 0,
                "usd": 0,
                "eur": 0,
                "expiring_calendar": [],
                "active_contracts_count": 0,
                "portfolio_contracts_count": 0,
                "total_portfolio_value_try": 0,
                "renewed_contracts_count": 0,
                "renewed_uplift_try": 0,
                "renewed_contracts_in_period_count": None,
                "renewed_uplift_in_period_try": None,
            })
            
        if tenant_company_id:
            query = query.eq("tenant_company_id", tenant_company_id)
            
        try:
            contracts = query.execute().data or []
        except Exception:
            # Backwards compatible: older schemas may not have new_amount/approved_at
            query = supabase.table("contracts").select(base_select)

            # Enforce security filtering based on user role
            if user["role"] in ["company_admin", "finance", "sales"]:
                company_scope = user["company_id"]
                query = query.or_(
                    f"tenant_company_id.eq.{company_scope},company_id.eq.{company_scope}"
                )
            elif user["role"] == "user":
                query = query.eq("company_id", user["company_id"])

            if tenant_company_id:
                query = query.eq("tenant_company_id", tenant_company_id)

            contracts = query.execute().data or []
    except Exception:
        contracts = []

    active_contracts = [
        c for c in contracts
        if c.get("status", "draft") not in ("client_approved", "client_rejected", "cancelled")
    ]
    portfolio_contracts = [
        c for c in contracts
        if c.get("status", "draft") not in ("client_rejected", "cancelled")
    ]

    expiring_30 = [c for c in active_contracts if c.get("end_date") and today_s <= c["end_date"] <= t30]
    pending = [c for c in active_contracts if c.get("end_date") and today_s <= c["end_date"] <= t60]

    t120 = (today + timedelta(days=120)).isoformat()
    calendar_rows = []
    for c in active_contracts:
        ed = c.get("end_date")
        if not ed or ed < today_s or ed > t120:
            continue
        try:
            days_u = (date.fromisoformat(ed[:10]) - today).days
        except ValueError:
            days_u = None
        co = c.get("companies") or {}
        calendar_rows.append(
            {
                "id": c["id"],
                "end_date": ed,
                "company_name": co.get("company_name") or "—",
                "days_until": days_u,
            }
        )
    calendar_rows.sort(key=lambda x: x["end_date"])

    market = get_cached_market_data()
    tufe = market.get("tufe", 0)
    ufe = market.get("ufe", 0)
    avg_adjustment = round((tufe + ufe) / 2, 1) if (tufe or ufe) else 0

    def _money(value):
        try:
            return float(value) if value is not None and str(value).strip() != "" else 0.0
        except (TypeError, ValueError):
            return 0.0

    def _current_portfolio_value(contract):
        if contract.get("status") == "client_approved":
            approved_amount = _money(contract.get("new_amount"))
            if approved_amount > 0:
                return approved_amount
        return _money(contract.get("previous_amount"))

    total_portfolio_value = sum(_current_portfolio_value(c) for c in portfolio_contracts)

    renewed_contracts = [
        c
        for c in contracts
        if c.get("status") == "client_approved"
    ]
    renewed_contracts_count = len(renewed_contracts)
    renewed_uplift = 0.0
    for c in renewed_contracts:
        prev = float(c.get("previous_amount") or 0)
        if prev <= 0:
            continue
        na = c.get("new_amount")
        try:
            new_amount = float(na) if na is not None and str(na).strip() != "" else None
        except (TypeError, ValueError):
            new_amount = None
        if new_amount is None:
            continue
        renewed_uplift += max(0.0, new_amount - prev)

    def _approved_date(value):
        if not value:
            return None
        try:
            s = str(value)
            return date.fromisoformat(s[:10])
        except Exception:
            return None

    renewed_contracts_in_period_count = None
    renewed_uplift_in_period = None
    if period_days is not None:
        start = today - timedelta(days=period_days)
        in_range = []
        for c in renewed_contracts:
            d = _approved_date(c.get("approved_at"))
            if d and start <= d <= today:
                in_range.append(c)
        renewed_contracts_in_period_count = len(in_range)
        uplift = 0.0
        for c in in_range:
            prev = float(c.get("previous_amount") or 0)
            if prev <= 0:
                continue
            na = c.get("new_amount")
            try:
                new_amount = float(na) if na is not None and str(na).strip() != "" else None
            except (TypeError, ValueError):
                new_amount = None
            if new_amount is None:
                continue
            uplift += max(0.0, new_amount - prev)
        renewed_uplift_in_period = uplift

    return jsonify({
        "expiring_30": len(expiring_30),
        "pending_approvals": len(pending),
        "avg_adjustment": avg_adjustment,
        "tufe": round(tufe, 2),
        "ufe": round(ufe, 2),
        "usd": market.get("usd", 0),
        "eur": market.get("eur", 0),
        "expiring_calendar": calendar_rows,
        "active_contracts_count": len(active_contracts),
        "portfolio_contracts_count": len(portfolio_contracts),
        "total_portfolio_value_try": round(total_portfolio_value, 2),
        "renewed_contracts_count": renewed_contracts_count,
        "renewed_uplift_try": round(renewed_uplift, 2),
        "renewed_contracts_in_period_count": renewed_contracts_in_period_count,
        "renewed_uplift_in_period_try": round(renewed_uplift_in_period, 2)
        if renewed_uplift_in_period is not None
        else None,
    })

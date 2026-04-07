from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

companies_bp = Blueprint("companies", __name__)


@companies_bp.route("/api/companies", methods=["GET"])
def list_companies():
    search = request.args.get("search", "").strip()

    try:
        query = supabase.table("companies").select(
            "*, contracts!contracts_company_id_fkey(id, previous_amount, end_date)"
        )
        if search:
            query = query.ilike("company_name", f"%{search}%")

        result = query.order("created_at", desc=True).execute()
    except Exception as e:
        print(f"[companies] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500

    today = date.today()
    t30 = str(today + timedelta(days=30))
    t60 = str(today + timedelta(days=60))
    today_s = str(today)

    companies = []
    for c in result.data:
        contracts = c.pop("contracts", None) or []
        total_value = sum(ct.get("previous_amount", 0) or 0 for ct in contracts)

        status = "Active"
        if not contracts:
            status = "Paused"
        else:
            end_dates = [ct["end_date"] for ct in contracts if ct.get("end_date")]
            if end_dates:
                nearest = min(end_dates)
                if nearest <= today_s:
                    status = "Critical"
                elif nearest <= t30:
                    status = "Critical"
                elif nearest <= t60:
                    status = "Renewing"

        c["contract_value"] = total_value
        c["status"] = status
        companies.append(c)

    return jsonify(companies)


@companies_bp.route("/api/companies/<company_id>", methods=["GET"])
def get_company(company_id):
    try:
        result = (
            supabase.table("companies")
            .select("*, contracts!contracts_company_id_fkey(id, previous_amount, end_date, inflation_base_rule, max_increase_limit)")
            .eq("id", company_id)
            .single()
            .execute()
        )
        return jsonify(result.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies", methods=["POST"])
def create_company():
    body = request.get_json()
    data = {
        "company_name": body["company_name"],
        "authorized_email": body["authorized_email"],
        "risk_score": body.get("risk_score"),
        "communication_language": body.get("communication_language", "profesyonel"),
    }
    result = supabase.table("companies").insert(data).execute()
    return jsonify(result.data[0]), 201


@companies_bp.route("/api/companies/<company_id>", methods=["PUT"])
def update_company(company_id):
    body = request.get_json()
    allowed = ["company_name", "authorized_email", "risk_score", "communication_language"]
    data = {k: v for k, v in body.items() if k in allowed}
    result = supabase.table("companies").update(data).eq("id", company_id).execute()
    return jsonify(result.data[0])


@companies_bp.route("/api/companies/<company_id>", methods=["DELETE"])
def delete_company(company_id):
    supabase.table("companies").delete().eq("id", company_id).execute()
    return jsonify({"ok": True})

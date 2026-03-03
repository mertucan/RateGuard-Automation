import uuid
from datetime import date, timedelta
from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

contracts_bp = Blueprint("contracts", __name__)


@contracts_bp.route("/api/contracts", methods=["GET"])
def list_contracts():
    company_id = request.args.get("company_id")
    pending = request.args.get("pending")

    try:
        query = supabase.table("contracts").select(
            "*, companies(company_name, authorized_email)"
        )

        if company_id:
            query = query.eq("company_id", company_id)

        if pending == "true":
            cutoff = (date.today() + timedelta(days=60)).isoformat()
            query = query.lte("end_date", cutoff)

        result = query.order("end_date", desc=False).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[contracts] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>", methods=["GET"])
def get_contract(contract_id):
    try:
        result = (
            supabase.table("contracts")
            .select("*, companies(company_name, authorized_email, communication_language)")
            .eq("id", contract_id)
            .single()
            .execute()
        )
        return jsonify(result.data)
    except Exception as e:
        print(f"[contract detail] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts", methods=["POST"])
def create_contract():
    body = request.get_json()
    data = {
        "id": str(uuid.uuid4()),
        "company_id": body["company_id"],
        "previous_amount": body["previous_amount"],
        "end_date": body.get("end_date"),
        "inflation_base_rule": body.get("inflation_base_rule", "TUFE"),
        "max_increase_limit": body.get("max_increase_limit"),
    }
    result = supabase.table("contracts").insert(data).execute()
    return jsonify(result.data[0]), 201


@contracts_bp.route("/api/contracts/<contract_id>", methods=["PUT"])
def update_contract(contract_id):
    body = request.get_json()
    allowed = [
        "previous_amount", "end_date", "inflation_base_rule",
        "max_increase_limit", "company_id",
    ]
    data = {k: v for k, v in body.items() if k in allowed}
    result = supabase.table("contracts").update(data).eq("id", contract_id).execute()
    return jsonify(result.data[0])


@contracts_bp.route("/api/contracts/<contract_id>", methods=["DELETE"])
def delete_contract(contract_id):
    supabase.table("contracts").delete().eq("id", contract_id).execute()
    return jsonify({"ok": True})

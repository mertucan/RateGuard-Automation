from flask import Blueprint, request, jsonify
from services.supabase_client import supabase
from services.auth_middleware import role_required

financial_logs_bp = Blueprint("financial_logs", __name__)


@financial_logs_bp.route("/api/financial-logs", methods=["GET"])
@role_required("super_admin", "company_admin", "finance")
def list_logs():
    limit = request.args.get("limit", 50, type=int)
    result = (
        supabase.table("financial_logs")
        .select("*")
        .order("record_date", desc=True)
        .limit(limit)
        .execute()
    )
    return jsonify(result.data)


@financial_logs_bp.route("/api/financial-logs", methods=["POST"])
@role_required("super_admin", "company_admin", "finance")
def create_log():
    body = request.get_json()
    data = {
        "record_date": body["record_date"],
        "exchange_rate": body.get("exchange_rate"),
        "tufe_data": body.get("tufe_data"),
        "ufe_data": body.get("ufe_data"),
    }
    result = supabase.table("financial_logs").insert(data).execute()
    return jsonify(result.data[0]), 201


@financial_logs_bp.route("/api/financial-logs/<log_id>", methods=["DELETE"])
@role_required("super_admin", "company_admin", "finance")
def delete_log(log_id):
    supabase.table("financial_logs").delete().eq("id", log_id).execute()
    return jsonify({"ok": True})

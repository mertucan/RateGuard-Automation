from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

renewals_bp = Blueprint("renewals", __name__)


@renewals_bp.route("/api/renewals", methods=["GET"])
def list_renewals():
    contract_id = request.args.get("contract_id")
    status = request.args.get("status")

    try:
        query = supabase.table("renewals").select(
            "*, contracts!renewals_contract_id_fkey(id, company_id, previous_amount, status)"
        )
        if contract_id:
            query = query.eq("contract_id", contract_id)
        if status:
            query = query.eq("approval_status", status)

        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[renewals] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@renewals_bp.route("/api/renewals", methods=["POST"])
def create_renewal():
    body = request.get_json()
    data = {
        "contract_id": body["contract_id"],
        "new_price": body.get("new_price"),
        "ai_text_draft": body.get("ai_text_draft"),
        "approval_status": body.get("approval_status"),
    }
    try:
        result = supabase.table("renewals").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@renewals_bp.route("/api/renewals/<renewal_id>", methods=["PUT"])
def update_renewal(renewal_id):
    body = request.get_json()
    allowed = ["new_price", "ai_text_draft", "approval_status"]
    data = {k: v for k, v in body.items() if k in allowed}
    try:
        result = (
            supabase.table("renewals")
            .update(data)
            .eq("id", renewal_id)
            .execute()
        )
        return jsonify(result.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@renewals_bp.route("/api/renewals/<renewal_id>", methods=["DELETE"])
def delete_renewal(renewal_id):
    try:
        supabase.table("renewals").delete().eq("id", renewal_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

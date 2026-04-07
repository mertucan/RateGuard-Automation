from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

communications_bp = Blueprint("communications", __name__)


@communications_bp.route("/api/communications", methods=["GET"])
def list_communications():
    contract_id = request.args.get("contract_id")

    try:
        query = supabase.table("communications").select(
            "*, users!communications_sender_user_id_fkey(id, full_name, role)"
        )
        if contract_id:
            query = query.eq("contract_id", contract_id)

        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[communications] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/communications", methods=["POST"])
def create_communication():
    body = request.get_json()
    data = {
        "contract_id": body.get("contract_id"),
        "sender_user_id": body.get("sender_user_id"),
        "message_text": body["message_text"],
    }
    try:
        result = supabase.table("communications").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/communications/<comm_id>", methods=["DELETE"])
def delete_communication(comm_id):
    try:
        supabase.table("communications").delete().eq("id", comm_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

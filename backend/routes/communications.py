from flask import Blueprint, request, jsonify, g
from services.supabase_client import supabase
from services.auth_middleware import login_required
from routes.contracts import _get_scoped_contract

communications_bp = Blueprint("communications", __name__)


@communications_bp.route("/api/communications", methods=["GET"])
@login_required
def list_communications():
    contract_id = request.args.get("contract_id")
    if not contract_id:
        return jsonify({"error": "contract_id is required"}), 400

    try:
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
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
@login_required
def create_communication():
    body = request.get_json()
    contract_id = body.get("contract_id")
    if not contract_id:
        return jsonify({"error": "contract_id is required"}), 400
    _, error = _get_scoped_contract(contract_id, g.current_user)
    if error:
        return error
    if g.current_user.get("role") == "finance":
        return jsonify({"error": "Finance role has read-only chat access"}), 403
    data = {
        "contract_id": contract_id,
        "sender_user_id": g.current_user["id"],
        "message_text": body["message_text"],
    }
    try:
        result = supabase.table("communications").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/communications/<comm_id>", methods=["DELETE"])
@login_required
def delete_communication(comm_id):
    try:
        row_res = (
            supabase.table("communications")
            .select("id, contract_id, sender_user_id")
            .eq("id", comm_id)
            .limit(1)
            .execute()
        )
        row = row_res.data[0] if row_res.data else None
        if not row:
            return jsonify({"error": "Message not found"}), 404
        _, error = _get_scoped_contract(row.get("contract_id"), g.current_user)
        if error:
            return error
        if g.current_user.get("role") not in ("super_admin", "company_admin") and str(row.get("sender_user_id")) != str(g.current_user.get("id")):
            return jsonify({"error": "Insufficient permissions"}), 403
        supabase.table("communications").delete().eq("id", comm_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/contracts/<contract_id>/messages", methods=["GET"])
@login_required
def get_contract_messages(contract_id):
    try:
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
        result = (
            supabase.table("communications")
            .select("*, users!communications_sender_user_id_fkey(id, full_name, role)")
            .eq("contract_id", contract_id)
            .order("created_at", desc=False)
            .execute()
        )
        return jsonify(result.data)
    except Exception as e:
        print(f"[messages] Error: {e}")
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/contracts/<contract_id>/messages", methods=["POST"])
@login_required
def send_contract_message(contract_id):
    body = request.get_json() or {}
    message_text = body.get("message_text", "").strip()
    if not message_text:
        return jsonify({"error": "message_text is required"}), 400
    _, error = _get_scoped_contract(contract_id, g.current_user)
    if error:
        return error
    if g.current_user.get("role") == "finance":
        return jsonify({"error": "Finance role has read-only chat access"}), 403

    data = {
        "contract_id": contract_id,
        "sender_user_id": g.current_user["id"],
        "message_text": message_text,
    }
    try:
        result = supabase.table("communications").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@communications_bp.route("/api/contracts/<contract_id>/analyze-tone", methods=["POST"])
@login_required
def analyze_contract_tone(contract_id):
    try:
        from services.gemini_service import analyze_communication_tone
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error

        contract_res = (
            supabase.table("contracts")
            .select("company_id")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        if not contract or not contract.get("company_id"):
            return jsonify({"error": "Contract not found"}), 404

        messages = (
            supabase.table("communications")
            .select("message_text")
            .eq("contract_id", contract_id)
            .order("created_at", desc=True)
            .limit(20)
            .execute()
        ).data or []

        if not messages:
            return jsonify({"tone": "professional", "note": "No messages to analyze"})

        texts = [m["message_text"] for m in messages]
        tone = analyze_communication_tone(texts)

        supabase.table("companies").update(
            {"communication_language": tone}
        ).eq("id", contract["company_id"]).execute()

        return jsonify({"tone": tone, "messages_analyzed": len(texts)})
    except Exception as e:
        print(f"[tone-analysis] Error: {e}")
        return jsonify({"error": str(e)}), 500

from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/api/notifications", methods=["GET"])
def list_notifications():
    contract_id = request.args.get("contract_id")
    unread_only = request.args.get("unread")

    try:
        query = supabase.table("notifications").select(
            "*, contracts!notifications_contract_id_fkey(id, status)"
        )
        if contract_id:
            query = query.eq("contract_id", contract_id)
        if unread_only == "true":
            query = query.eq("is_read", False)

        result = query.order("created_at", desc=True).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[notifications] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications", methods=["POST"])
def create_notification():
    body = request.get_json()
    data = {
        "contract_id": body.get("contract_id"),
        "title": body["title"],
        "message": body["message"],
        "type": body.get("type", "warning"),
    }
    try:
        result = supabase.table("notifications").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/<notification_id>/read", methods=["POST"])
def mark_read(notification_id):
    try:
        result = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .execute()
        )
        return jsonify(result.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/read-all", methods=["POST"])
def mark_all_read():
    try:
        result = (
            supabase.table("notifications")
            .update({"is_read": True})
            .eq("is_read", False)
            .execute()
        )
        return jsonify({"updated": len(result.data)})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/<notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    try:
        supabase.table("notifications").delete().eq("id", notification_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

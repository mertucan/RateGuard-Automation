from flask import Blueprint, g, jsonify, request

from services.auth_middleware import login_required
from services.notification_service import create_notification
from services.supabase_client import supabase

notifications_bp = Blueprint("notifications", __name__)


def _notification_visible_to_user(notification, user):
    role = user.get("role")
    user_id = str(user.get("id") or "")
    company_id = str(user.get("company_id") or "")

    if role == "super_admin":
        return True

    recipient_user_id = notification.get("recipient_user_id")
    if recipient_user_id and str(recipient_user_id) == user_id:
        return True

    recipient_company_id = notification.get("recipient_company_id")
    if recipient_company_id and company_id and str(recipient_company_id) == company_id:
        return True

    contract = notification.get("contracts") or {}
    if company_id and (
        str(contract.get("tenant_company_id") or "") == company_id
        or str(contract.get("company_id") or "") == company_id
    ):
        return True

    return False


def _visible_notifications(user, unread_only=False, limit=50):
    select_clause = "*, contracts(id, status, tenant_company_id, company_id)"
    fetch_limit = min(max(limit * 5, 100), 500)
    try:
        query = supabase.table("notifications").select(select_clause).order("created_at", desc=True)
        if unread_only:
            query = query.eq("is_read", False)
        rows = query.limit(fetch_limit).execute().data or []
    except Exception:
        query = supabase.table("notifications").select("*").order("created_at", desc=True)
        if unread_only:
            query = query.eq("is_read", False)
        rows = query.limit(fetch_limit).execute().data or []

    return [row for row in rows if _notification_visible_to_user(row, user)][:limit]


@notifications_bp.route("/api/notifications", methods=["GET"])
@login_required
def list_notifications():
    contract_id = request.args.get("contract_id")
    unread_only = request.args.get("unread") == "true"
    try:
        limit = int(request.args.get("limit", "50"))
    except ValueError:
        limit = 50
    limit = min(max(limit, 1), 100)

    try:
        rows = _visible_notifications(g.current_user, unread_only=unread_only, limit=limit)
        if contract_id:
            rows = [row for row in rows if str(row.get("contract_id")) == str(contract_id)]
        return jsonify(rows)
    except Exception as e:
        print(f"[notifications] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications", methods=["POST"])
@login_required
def create_notification_route():
    body = request.get_json() or {}
    user = g.current_user
    if user.get("role") not in ("super_admin", "company_admin", "finance", "sales", "hr"):
        return jsonify({"error": "Insufficient permissions"}), 403

    try:
        row = create_notification(
            title=body["title"],
            message=body["message"],
            notification_type=body.get("type", "info"),
            contract_id=body.get("contract_id"),
            recipient_user_id=body.get("recipient_user_id"),
            recipient_company_id=body.get("recipient_company_id") or user.get("company_id"),
            action_url=body.get("action_url"),
            category=body.get("category", "manual"),
            metadata=body.get("metadata") or {},
        )
        return jsonify(row), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/<notification_id>/read", methods=["POST"])
@login_required
def mark_read(notification_id):
    try:
        visible = _visible_notifications(g.current_user, unread_only=False, limit=100)
        if not any(str(row.get("id")) == str(notification_id) for row in visible):
            return jsonify({"error": "Notification not found"}), 404
        result = supabase.table("notifications").update({"is_read": True}).eq("id", notification_id).execute()
        return jsonify(result.data[0] if result.data else {"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/read-all", methods=["POST"])
@login_required
def mark_all_read():
    try:
        visible = _visible_notifications(g.current_user, unread_only=True, limit=500)
        ids = [row["id"] for row in visible if row.get("id")]
        if not ids:
            return jsonify({"updated": 0})
        result = supabase.table("notifications").update({"is_read": True}).in_("id", ids).execute()
        return jsonify({"updated": len(result.data or [])})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/<notification_id>", methods=["DELETE"])
@login_required
def delete_notification(notification_id):
    try:
        visible = _visible_notifications(g.current_user, unread_only=False, limit=100)
        if not any(str(row.get("id")) == str(notification_id) for row in visible):
            return jsonify({"error": "Notification not found"}), 404
        supabase.table("notifications").delete().eq("id", notification_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@notifications_bp.route("/api/notifications/check-expiring", methods=["POST"])
@login_required
def check_expiring():
    """Check expiring contracts and create scoped notifications."""
    if g.current_user.get("role") not in ("super_admin", "company_admin", "finance"):
        return jsonify({"error": "Insufficient permissions"}), 403
    try:
        from services.notification_service import check_expiring_contracts

        results = check_expiring_contracts()
        return jsonify(results)
    except Exception as e:
        print(f"[check-expiring] Error: {e}")
        return jsonify({"error": str(e)}), 500

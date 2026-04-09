from flask import Blueprint, request, jsonify, g
from services.supabase_client import supabase
from services.auth_middleware import login_required

audit_logs_bp = Blueprint("audit_logs", __name__)


def log_audit(user_id, user_name, action, entity_type, entity_id=None, details=None):
    try:
        data = {
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "details": details,
        }
        supabase.table("audit_logs").insert(data).execute()
    except Exception as e:
        print(f"[AuditLog] Failed to log: {e}")


@audit_logs_bp.route("/api/audit-logs", methods=["GET"])
@login_required
def list_audit_logs():
    user = g.current_user
    limit = request.args.get("limit", "100")
    entity_type = request.args.get("entity_type")

    try:
        query = supabase.table("audit_logs").select("*")

        if user["role"] not in ("super_admin",):
            if user.get("company_id"):
                query = query.eq("user_id", user["id"])

        if entity_type:
            query = query.eq("entity_type", entity_type)

        result = query.order("created_at", desc=True).limit(int(limit)).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[AuditLog] Error: {e}")
        return jsonify({"error": str(e)}), 500

from flask import Blueprint, request, jsonify, g, has_request_context
from services.supabase_client import supabase
from services.auth_middleware import login_required

audit_logs_bp = Blueprint("audit_logs", __name__)

SENSITIVE_KEY_PARTS = (
    "password",
    "token",
    "secret",
    "code",
    "hash",
    "authorization",
    "cookie",
)


def _is_sensitive_key(key):
    key_text = str(key or "").lower()
    return any(part in key_text for part in SENSITIVE_KEY_PARTS)


def _redact_details(value, key=None):
    if _is_sensitive_key(key):
        return "[redacted]"
    if isinstance(value, dict):
        return {k: _redact_details(v, k) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact_details(item) for item in value]
    return value


def _request_ip():
    if not has_request_context():
        return None
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        return forwarded_for.split(",", 1)[0].strip()
    return request.remote_addr


def _current_actor(user_id=None, user_name=None):
    current = getattr(g, "current_user", None) if has_request_context() else None
    current = current or {}
    return {
        "id": user_id or current.get("id"),
        "name": user_name or current.get("full_name"),
        "email": current.get("email"),
        "role": current.get("role"),
        "company_id": current.get("company_id"),
    }


def normalize_audit_details(details=None, user_id=None, user_name=None):
    if isinstance(details, dict):
        payload = dict(details)
    elif details is None:
        payload = {}
    else:
        payload = {"note": details}

    payload = _redact_details(payload)
    if has_request_context():
        payload["_context"] = {
            "request_id": getattr(g, "request_id", None),
            "actor": _redact_details(_current_actor(user_id, user_name)),
            "ip_address": _request_ip(),
            "user_agent": request.headers.get("User-Agent"),
        }
    return payload


def build_change_details(before, after, fields=None, extra=None):
    before = before or {}
    after = after or {}
    keys = fields or sorted(set(before.keys()) | set(after.keys()))
    changes = {}
    for key in keys:
        before_value = before.get(key)
        after_value = after.get(key)
        if before_value != after_value:
            changes[key] = {
                "before": _redact_details(before_value, key),
                "after": _redact_details(after_value, key),
            }

    details = {"changes": changes}
    if extra:
        details.update(extra)
    return details


def log_audit(user_id, user_name, action, entity_type, entity_id=None, details=None):
    try:
        data = {
            "user_id": user_id,
            "user_name": user_name,
            "action": action,
            "entity_type": entity_type,
            "entity_id": str(entity_id) if entity_id else None,
            "details": normalize_audit_details(details, user_id, user_name),
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

        if user["role"] == "company_admin" and user.get("company_id"):
            company_users = (
                supabase.table("users")
                .select("id")
                .eq("company_id", user["company_id"])
                .execute()
            )
            user_ids = [row["id"] for row in (company_users.data or []) if row.get("id")]
            if user_ids:
                query = query.in_("user_id", user_ids)
            else:
                query = query.eq("user_id", user["id"])
        elif user["role"] not in ("super_admin",):
            query = query.eq("user_id", user["id"])

        if entity_type:
            query = query.eq("entity_type", entity_type)

        result = query.order("created_at", desc=True).limit(int(limit)).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[AuditLog] Error: {e}")
        return jsonify({"error": str(e)}), 500

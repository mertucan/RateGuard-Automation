from functools import wraps
from flask import request, jsonify, g
from services.supabase_client import supabase


def get_current_user():
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        return None
    try:
        result = (
            supabase.table("users")
            .select("id, full_name, email, role, company_id")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data
    except Exception:
        return None


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({"error": "Authentication required"}), 401
        g.current_user = user
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            if user.get("role") not in roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            g.current_user = user
            return f(*args, **kwargs)
        return decorated
    return decorator

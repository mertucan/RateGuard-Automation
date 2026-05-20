from functools import wraps
from flask import request, jsonify, g
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from config import ALLOW_INSECURE_DEV_AUTH, APP_SECRET_KEY
from services.supabase_client import supabase

TOKEN_MAX_AGE_SECONDS = 60 * 60 * 12
_serializer = URLSafeTimedSerializer(APP_SECRET_KEY, salt="rateguard-auth")


def issue_auth_token(user):
    return _serializer.dumps({"user_id": user["id"]})


def _user_by_id(user_id):
    if not user_id:
        return None
    result = (
        supabase.table("users")
        .select("id, full_name, email, role, company_id")
        .eq("id", user_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def get_current_user():
    auth_header = request.headers.get("Authorization", "")
    token = ""
    if auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1].strip()
    if token:
        try:
            payload = _serializer.loads(token, max_age=TOKEN_MAX_AGE_SECONDS)
            return _user_by_id(payload.get("user_id"))
        except (BadSignature, SignatureExpired):
            return None
        except Exception:
            return None

    if not ALLOW_INSECURE_DEV_AUTH:
        return None

    user_id = request.headers.get("X-User-Id")
    try:
        return _user_by_id(user_id)
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

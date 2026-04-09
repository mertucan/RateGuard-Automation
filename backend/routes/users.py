from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from services.supabase_client import supabase

users_bp = Blueprint("users", __name__)

VALID_ROLES = {"super_admin", "company_admin", "finance", "sales", "client"}


def _sanitize_user(user):
    if not user:
        return user
    cleaned = dict(user)
    cleaned.pop("password_hash", None)
    return cleaned


@users_bp.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json() or {}
    full_name = (body.get("full_name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "client").strip()
    company_id = body.get("company_id")
    company_name = (body.get("company_name") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "full_name, email and password are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if role not in VALID_ROLES:
        return jsonify({"error": "Invalid role."}), 400

    try:
        exists = (
            supabase.table("users")
            .select("id")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if exists.data:
            return jsonify({"error": "This email is already registered."}), 409

        if role == "company_admin" and company_name and not company_id:
            company_data = {
                "company_name": company_name,
                "authorized_email": email,
                "is_tenant": True,
                "communication_language": "profesyonel",
            }
            company_result = supabase.table("companies").insert(company_data).execute()
            if company_result.data:
                company_id = company_result.data[0]["id"]

        password_hash = generate_password_hash(password)
        data = {
            "full_name": full_name,
            "email": email,
            "role": role,
            "company_id": company_id,
            "password_hash": password_hash,
        }
        created = supabase.table("users").insert(data).execute()
        user = _sanitize_user(created.data[0]) if created.data else None
        return jsonify(user), 201
    except Exception as e:
        print(f"[auth/register] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/auth/login", methods=["POST"])
def login():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""

    if not email or not password:
        return jsonify({"error": "email ve password zorunludur."}), 400

    try:
        result = (
            supabase.table("users")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if not result.data:
            return jsonify({"error": "E-posta veya şifre hatalı."}), 401

        user = result.data[0]
        password_hash = user.get("password_hash")
        if not password_hash or not check_password_hash(password_hash, password):
            return jsonify({"error": "E-posta veya şifre hatalı."}), 401

        return jsonify(_sanitize_user(user))
    except Exception as e:
        print(f"[auth/login] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["GET"])
def list_users():
    company_id = request.args.get("company_id")
    role = request.args.get("role")

    try:
        query = supabase.table("users").select(
            "*, companies!users_company_id_fkey(id, company_name)"
        )
        if company_id:
            query = query.eq("company_id", company_id)
        if role:
            query = query.eq("role", role)

        result = query.order("created_at", desc=True).execute()
        return jsonify([_sanitize_user(u) for u in result.data])
    except Exception as e:
        print(f"[users] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["GET"])
def get_user(user_id):
    try:
        result = (
            supabase.table("users")
            .select("*, companies!users_company_id_fkey(id, company_name)")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return jsonify(_sanitize_user(result.data))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["POST"])
def create_user():
    body = request.get_json() or {}
    role = body["role"]
    if role not in VALID_ROLES:
        return jsonify({"error": "Geçersiz rol değeri."}), 400

    password = body.get("password")
    data = {
        "full_name": body["full_name"],
        "email": body["email"].strip().lower(),
        "role": role,
        "company_id": body.get("company_id"),
    }
    if password:
        if len(password) < 8:
            return jsonify({"error": "Şifre en az 8 karakter olmalıdır."}), 400
        data["password_hash"] = generate_password_hash(password)
    try:
        result = supabase.table("users").insert(data).execute()
        return jsonify(_sanitize_user(result.data[0])), 201
    except Exception as e:
        print(f"[users] Create error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["PUT"])
def update_user(user_id):
    body = request.get_json() or {}
    allowed = ["full_name", "email", "role", "company_id", "password"]
    data = {k: v for k, v in body.items() if k in allowed}
    if "email" in data and data["email"]:
        data["email"] = data["email"].strip().lower()
    if "role" in data and data["role"] not in VALID_ROLES:
        return jsonify({"error": "Geçersiz rol değeri."}), 400
    if "password" in data:
        password = data.pop("password") or ""
        if len(password) < 8:
            return jsonify({"error": "Şifre en az 8 karakter olmalıdır."}), 400
        data["password_hash"] = generate_password_hash(password)
    try:
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        return jsonify(_sanitize_user(result.data[0]))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

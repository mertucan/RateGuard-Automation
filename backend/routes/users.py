import random
import string
from datetime import datetime, timezone, timedelta

from flask import Blueprint, g, jsonify, request
from werkzeug.security import check_password_hash, generate_password_hash

from services.auth_middleware import issue_auth_token, login_required, role_required
from services.email_service import render_email, send_email, send_welcome_email
from services.supabase_client import supabase

users_bp = Blueprint("users", __name__)

VALID_ROLES = {"super_admin", "company_admin", "finance", "sales", "hr", "user"}
PUBLIC_REGISTER_ROLES = {"company_admin", "user"}
TEAM_MANAGED_ROLES = {"finance", "sales", "hr", "user"}


def _sanitize_user(user):
    if not user:
        return user
    cleaned = dict(user)
    cleaned.pop("password_hash", None)
    return cleaned


def _get_user_row(user_id, select="*, companies!users_company_id_fkey(id, company_name)"):
    result = supabase.table("users").select(select).eq("id", user_id).limit(1).execute()
    return result.data[0] if result.data else None


@users_bp.route("/api/auth/register", methods=["POST"])
def register():
    body = request.get_json() or {}
    full_name = (body.get("full_name") or "").strip()
    email = (body.get("email") or "").strip().lower()
    password = body.get("password") or ""
    role = (body.get("role") or "user").strip()
    company_id = body.get("company_id")
    company_name = (body.get("company_name") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"error": "full_name, email and password are required."}), 400
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if role not in VALID_ROLES:
        return jsonify({"error": "Invalid role."}), 400
    if role not in PUBLIC_REGISTER_ROLES:
        return jsonify({"error": "This role cannot self-register."}), 403
    if role == "user":
        company_id = None

    try:
        exists = supabase.table("users").select("id").eq("email", email).limit(1).execute()
        if exists.data:
            return jsonify({"error": "This email is already registered."}), 409

        if role == "company_admin" and company_name and not company_id:
            company_data = {
                "company_name": company_name,
                "authorized_email": email,
                "is_tenant": True,
                "communication_language": "professional",
            }
            company_result = supabase.table("companies").insert(company_data).execute()
            if company_result.data:
                company_id = company_result.data[0]["id"]

        data = {
            "full_name": full_name,
            "email": email,
            "role": role,
            "company_id": company_id,
            "password_hash": generate_password_hash(password),
        }
        created = supabase.table("users").insert(data).execute()
        user = _sanitize_user(created.data[0]) if created.data else None
        if user:
            try:
                send_welcome_email(email, full_name=full_name, role=role)
            except Exception as email_err:
                print(f"[auth/register] Welcome email error: {email_err}")
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
        return jsonify({"error": "email and password are required."}), 400

    try:
        result = supabase.table("users").select("*").eq("email", email).limit(1).execute()
        if not result.data:
            return jsonify({"error": "Invalid email or password."}), 401

        user = result.data[0]
        password_hash = user.get("password_hash")
        if not password_hash or not check_password_hash(password_hash, password):
            return jsonify({"error": "Invalid email or password."}), 401

        sanitized = _sanitize_user(user)
        sanitized["access_token"] = issue_auth_token(user)
        return jsonify(sanitized)
    except Exception as e:
        print(f"[auth/login] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["GET"])
@login_required
def list_users():
    current = g.current_user
    company_id = request.args.get("company_id")
    role = request.args.get("role")
    unassigned = request.args.get("unassigned")

    try:
        query = supabase.table("users").select(
            "*, companies!users_company_id_fkey(id, company_name)"
        )
        if current["role"] == "super_admin":
            if company_id:
                query = query.eq("company_id", company_id)
            if unassigned == "true":
                query = query.is_("company_id", "null")
        elif current["role"] == "company_admin":
            if unassigned == "true":
                query = query.is_("company_id", "null")
            elif current.get("company_id"):
                query = query.eq("company_id", current["company_id"])
            else:
                return jsonify([])
        else:
            return jsonify({"error": "Insufficient permissions"}), 403

        if role:
            query = query.eq("role", role)

        result = query.order("created_at", desc=True).execute()
        return jsonify([_sanitize_user(u) for u in result.data])
    except Exception as e:
        print(f"[users] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["GET"])
@login_required
def get_user(user_id):
    try:
        current = g.current_user
        user = _get_user_row(user_id)
        if not user:
            return jsonify(None)
        if current["role"] == "super_admin":
            return jsonify(_sanitize_user(user))
        if current["role"] == "company_admin" and str(current.get("company_id")) == str(user.get("company_id")):
            return jsonify(_sanitize_user(user))
        if str(current.get("id")) == str(user_id):
            return jsonify(_sanitize_user(user))
        return jsonify({"error": "Insufficient permissions"}), 403
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["POST"])
@role_required("super_admin")
def create_user():
    body = request.get_json() or {}
    role = body["role"]
    if role not in VALID_ROLES:
        return jsonify({"error": "Invalid role."}), 400

    password = body.get("password")
    data = {
        "full_name": body["full_name"],
        "email": body["email"].strip().lower(),
        "role": role,
        "company_id": body.get("company_id"),
    }
    if password:
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters."}), 400
        data["password_hash"] = generate_password_hash(password)
    try:
        result = supabase.table("users").insert(data).execute()
        return jsonify(_sanitize_user(result.data[0])), 201
    except Exception as e:
        print(f"[users] Create error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["PUT"])
@login_required
def update_user(user_id):
    current = g.current_user
    body = request.get_json() or {}
    allowed = ["full_name", "email", "role", "company_id", "password"]
    data = {k: v for k, v in body.items() if k in allowed}

    try:
        target = _get_user_row(user_id, "id, role, company_id")
        if not target:
            return jsonify({"error": "User not found"}), 404

        if current["role"] == "super_admin":
            pass
        elif current["role"] == "company_admin":
            if str(target.get("company_id") or "") not in ("", str(current.get("company_id"))):
                return jsonify({"error": "Insufficient permissions"}), 403
            data["company_id"] = current.get("company_id")
            if data.get("role") not in TEAM_MANAGED_ROLES:
                return jsonify({"error": "Company admins can only assign team roles."}), 403
            data.pop("password", None)
            data.pop("email", None)
            data.pop("full_name", None)
        elif str(current.get("id")) == str(user_id):
            data = {k: v for k, v in data.items() if k in ("full_name", "email", "password")}
        else:
            return jsonify({"error": "Insufficient permissions"}), 403

        if "email" in data and data["email"]:
            data["email"] = data["email"].strip().lower()
        if "role" in data and data["role"] not in VALID_ROLES:
            return jsonify({"error": "Invalid role."}), 400
        if "password" in data:
            password = data.pop("password") or ""
            if len(password) < 8:
                return jsonify({"error": "Password must be at least 8 characters."}), 400
            data["password_hash"] = generate_password_hash(password)
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        return jsonify(_sanitize_user(result.data[0]))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["DELETE"])
@role_required("super_admin", "company_admin")
def delete_user(user_id):
    try:
        current = g.current_user
        user = _get_user_row(user_id, "*, companies!users_company_id_fkey(company_name)")
        if not user:
            return jsonify({"error": "User not found"}), 404
        if current["role"] == "company_admin" and str(user.get("company_id")) != str(current.get("company_id")):
            return jsonify({"error": "Insufficient permissions"}), 403
        if user.get("role") == "super_admin" and current["role"] != "super_admin":
            return jsonify({"error": "Insufficient permissions"}), 403

        company_name = user.get("companies", {}).get("company_name", "the company") if user.get("companies") else "the company"
        old_role = user.get("role", "member")
        email = user.get("email")
        full_name = user.get("full_name") or "User"

        supabase.table("users").update({"company_id": None, "role": "user"}).eq("id", user_id).execute()

        if email and user.get("company_id"):
            try:
                from services.email_service import send_user_removed_email

                send_user_removed_email(email, full_name, company_name, old_role)
            except Exception as email_err:
                print(f"[delete_user] Email send error: {email_err}")

        return jsonify({"ok": True, "message": "User removed from company and reverted to user."})
    except Exception as e:
        print(f"[delete_user] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email address is required."}), 400

    try:
        result = supabase.table("users").select("id").eq("email", email).limit(1).execute()
        if not result.data:
            return jsonify({"ok": True, "message": "If that email exists, a reset code has been sent."})

        code = "".join(random.choices(string.digits, k=6))
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

        supabase.table("password_reset_codes").delete().eq("email", email).eq("used", False).execute()
        supabase.table("password_reset_codes").insert(
            {"email": email, "code": code, "expires_at": expires_at, "used": False}
        ).execute()

        code_html = (
            '<div style="margin: 22px 0; padding: 18px; background: #f8fafc; '
            'border: 1px solid #e2e8f0; border-radius: 10px; text-align: center;">'
            f'<span style="font-size: 32px; letter-spacing: 10px; color: #0f172a; font-weight: 800;">{code}</span>'
            "</div>"
        )
        body_html = render_email(
            title="Password reset code",
            intro=[
                "We received a request to reset your RateGuard password.",
                "Use the verification code below to continue.",
                code_html,
                "This code expires in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.",
            ],
        )
        send_email(email, "Your RateGuard Password Reset Code", body_html)

        return jsonify({"ok": True, "message": "If that email exists, a reset code has been sent."})
    except Exception as e:
        print(f"[auth/forgot-password] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/auth/reset-password", methods=["POST"])
def reset_password():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()
    code = (body.get("code") or "").strip()
    new_password = body.get("new_password") or ""

    if not email or not code or not new_password:
        return jsonify({"error": "Email, code, and new password are required."}), 400
    if len(new_password) < 8:
        return jsonify({"error": "Password must be at least 8 characters."}), 400
    if not code.isdigit() or len(code) != 6:
        return jsonify({"error": "Invalid reset code format."}), 400

    try:
        now = datetime.now(timezone.utc).isoformat()
        result = (
            supabase.table("password_reset_codes")
            .select("*")
            .eq("email", email)
            .eq("code", code)
            .eq("used", False)
            .gte("expires_at", now)
            .limit(1)
            .execute()
        )
        if not result.data:
            return jsonify({"error": "Invalid or expired reset code. Please request a new one."}), 400

        record = result.data[0]
        supabase.table("password_reset_codes").update({"used": True}).eq("id", record["id"]).execute()
        supabase.table("users").update({"password_hash": generate_password_hash(new_password)}).eq("email", email).execute()

        return jsonify({"ok": True, "message": "Password updated successfully."})
    except Exception as e:
        print(f"[auth/reset-password] Error: {e}")
        return jsonify({"error": str(e)}), 500

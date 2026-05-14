import random
import string
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from services.supabase_client import supabase
from services.email_service import send_email

users_bp = Blueprint("users", __name__)

VALID_ROLES = {"super_admin", "company_admin", "finance", "sales", "hr", "user", "client"}  # "client" kept for backward compat


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
    role = (body.get("role") or "user").strip()
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
                "communication_language": "professional",
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
        return jsonify({"error": "email and password are required."}), 400

    try:
        result = (
            supabase.table("users")
            .select("*")
            .eq("email", email)
            .limit(1)
            .execute()
        )
        if not result.data:
            return jsonify({"error": "Invalid email or password."}), 401

        user = result.data[0]
        password_hash = user.get("password_hash")
        if not password_hash or not check_password_hash(password_hash, password):
            return jsonify({"error": "Invalid email or password."}), 401

        return jsonify(_sanitize_user(user))
    except Exception as e:
        print(f"[auth/login] Error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["GET"])
def list_users():
    company_id = request.args.get("company_id")
    role = request.args.get("role")
    unassigned = request.args.get("unassigned")

    try:
        query = supabase.table("users").select(
            "*, companies!users_company_id_fkey(id, company_name)"
        )
        if company_id:
            query = query.eq("company_id", company_id)
        if role:
            query = query.eq("role", role)
        if unassigned == "true":
            # Supabase'de null check için is_ kullanıyoruz
            query = query.is_("company_id", "null")

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
            .limit(1)
            .execute()
        )
        return jsonify(_sanitize_user(result.data[0] if result.data else None))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["POST"])
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
def update_user(user_id):
    body = request.get_json() or {}
    allowed = ["full_name", "email", "role", "company_id", "password"]
    data = {k: v for k, v in body.items() if k in allowed}
    if "email" in data and data["email"]:
        data["email"] = data["email"].strip().lower()
    if "role" in data and data["role"] not in VALID_ROLES:
        return jsonify({"error": "Invalid role."}), 400
    if "password" in data:
        password = data.pop("password") or ""
        if len(password) < 8:
            return jsonify({"error": "Password must be at least 8 characters."}), 400
        data["password_hash"] = generate_password_hash(password)
    try:
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        return jsonify(_sanitize_user(result.data[0]))
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        # Fetch user and company details
        user_res = supabase.table("users").select("*, companies!users_company_id_fkey(company_name)").eq("id", user_id).limit(1).execute()
        if not user_res.data:
            return jsonify({"error": "User not found"}), 404
            
        user = user_res.data[0]
        company_name = user.get("companies", {}).get("company_name", "the company") if user.get("companies") else "the company"
        old_role = user.get("role", "member")
        email = user.get("email")
        full_name = user.get("full_name") or "User"
        
        # Update user instead of deleting
        supabase.table("users").update({
            "company_id": None,
            "role": "user"
        }).eq("id", user_id).execute()
        
        # Send removal email
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


# ── Forgot / Reset Password ────────────────────────────────────────────────────

@users_bp.route("/api/auth/forgot-password", methods=["POST"])
def forgot_password():
    body = request.get_json() or {}
    email = (body.get("email") or "").strip().lower()

    if not email:
        return jsonify({"error": "Email address is required."}), 400

    try:
        result = supabase.table("users").select("id").eq("email", email).limit(1).execute()
        if not result.data:
            # Return success even if email not found (security best practice)
            return jsonify({"ok": True, "message": "If that email exists, a reset code has been sent."})

        code = "".join(random.choices(string.digits, k=6))
        expires_at = (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()

        # Remove any existing unused codes for this email
        supabase.table("password_reset_codes").delete().eq("email", email).eq("used", False).execute()

        # Insert new code
        supabase.table("password_reset_codes").insert({
            "email": email,
            "code": code,
            "expires_at": expires_at,
            "used": False,
        }).execute()

        # Send email
        body_html = f"""
        <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #136dec, #0e52b5); padding: 24px; border-radius: 12px 12px 0 0;">
                <h1 style="color: white; margin: 0; font-size: 20px;">RateGuard</h1>
            </div>
            <div style="background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <h2 style="color: #0f172a; font-size: 18px; margin-top: 0;">Password Reset Request</h2>
                <p style="color: #64748b; line-height: 1.6;">
                    We received a request to reset your password. Use the 6-digit code below:
                </p>
                <div style="text-align: center; margin: 24px 0;">
                    <span style="font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #136dec; background: #f0f7ff; padding: 16px 24px; border-radius: 12px; border: 2px solid #bfdbfe;">
                        {code}
                    </span>
                </div>
                <p style="color: #64748b; line-height: 1.6; font-size: 13px;">
                    This code expires in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
                </p>
            </div>
            <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 16px;">
                RateGuard &mdash; Automated Contract Management
            </p>
        </div>
        """
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

        # Mark code as used
        supabase.table("password_reset_codes").update({"used": True}).eq("id", record["id"]).execute()

        # Update user password
        new_hash = generate_password_hash(new_password)
        supabase.table("users").update({"password_hash": new_hash}).eq("email", email).execute()

        return jsonify({"ok": True, "message": "Password updated successfully."})
    except Exception as e:
        print(f"[auth/reset-password] Error: {e}")
        return jsonify({"error": str(e)}), 500

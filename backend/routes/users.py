from flask import Blueprint, request, jsonify
from services.supabase_client import supabase

users_bp = Blueprint("users", __name__)


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
        return jsonify(result.data)
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
        return jsonify(result.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users", methods=["POST"])
def create_user():
    body = request.get_json()
    data = {
        "full_name": body["full_name"],
        "email": body["email"],
        "role": body["role"],
        "company_id": body.get("company_id"),
    }
    try:
        result = supabase.table("users").insert(data).execute()
        return jsonify(result.data[0]), 201
    except Exception as e:
        print(f"[users] Create error: {e}")
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["PUT"])
def update_user(user_id):
    body = request.get_json()
    allowed = ["full_name", "email", "role", "company_id"]
    data = {k: v for k, v in body.items() if k in allowed}
    try:
        result = supabase.table("users").update(data).eq("id", user_id).execute()
        return jsonify(result.data[0])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@users_bp.route("/api/users/<user_id>", methods=["DELETE"])
def delete_user(user_id):
    try:
        supabase.table("users").delete().eq("id", user_id).execute()
        return jsonify({"ok": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

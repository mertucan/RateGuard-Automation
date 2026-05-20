from flask import Blueprint, g, jsonify, send_file
from services.calculation import calculate_renewal
from services.auth_middleware import login_required
from services.pdf_generator import generate_addendum_pdf
from services.pdf_naming import addendum_download_name
from services.supabase_client import supabase

calculations_bp = Blueprint("calculations", __name__)


def _can_access_contract(contract_id):
    user = g.current_user
    result = (
        supabase.table("contracts")
        .select("id, company_id, tenant_company_id")
        .eq("id", contract_id)
        .limit(1)
        .execute()
    )
    contract = result.data[0] if result.data else None
    if not contract:
        return jsonify({"error": "Contract not found"}), 404
    if user.get("role") == "super_admin":
        return None
    company_id = str(user.get("company_id") or "")
    if user.get("role") in ("company_admin", "finance", "sales") and company_id in (
        str(contract.get("company_id") or ""),
        str(contract.get("tenant_company_id") or ""),
    ):
        return None
    if user.get("role") == "user" and company_id == str(contract.get("company_id") or ""):
        return None
    return jsonify({"error": "Insufficient permissions"}), 403


@calculations_bp.route("/api/contracts/<contract_id>/calculate", methods=["GET"])
@login_required
def get_calculation(contract_id):
    try:
        access_error = _can_access_contract(contract_id)
        if access_error:
            return access_error
        result = calculate_renewal(contract_id)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"[calculation] Error: {e}")
        return jsonify({"error": str(e)}), 500


@calculations_bp.route("/api/contracts/<contract_id>/pdf", methods=["GET"])
@login_required
def download_pdf(contract_id):
    try:
        access_error = _can_access_contract(contract_id)
        if access_error:
            return access_error
        calc = calculate_renewal(contract_id)
        pdf_buf = generate_addendum_pdf(calc)

        filename = addendum_download_name(contract_id)

        return send_file(
            pdf_buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except Exception as e:
        print(f"[pdf] Error: {e}")
        return jsonify({"error": str(e)}), 500

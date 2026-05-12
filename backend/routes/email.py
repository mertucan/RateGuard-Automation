from flask import Blueprint, request, jsonify
from services.calculation import calculate_renewal
from services.gemini_service import generate_email_draft

email_bp = Blueprint("email", __name__)


@email_bp.route("/api/contracts/<contract_id>/generate-email", methods=["POST"])
def generate_email(contract_id):
    """Gemini API ile sözleşme yenileme e-posta taslağı oluşturur."""
    try:
        calc = calculate_renewal(contract_id)

        body = request.get_json() or {}
        if body.get("new_amount") is not None:
            calc["new_amount"] = body["new_amount"]
            calc["difference"] = body["new_amount"] - calc["previous_amount"]
        if body.get("applied_adjustment") is not None:
            calc["applied_adjustment"] = body["applied_adjustment"]
        if body.get("inflation_base_rule"):
            calc["inflation_base_rule"] = body["inflation_base_rule"]
        if body.get("max_increase_limit") is not None:
            calc["max_increase_limit"] = body["max_increase_limit"]

        result = generate_email_draft(calc)
        return jsonify(result)
    except ValueError as e:
        return jsonify({"error": str(e)}), 404
    except RuntimeError as e:
        print(f"[generate-email] Gemini error: {e}")
        error_msg = str(e)
        if "429" in error_msg or "quota" in error_msg.lower():
            return jsonify({"error": "AI kota limiti aşıldı. Lütfen birkaç dakika bekleyip tekrar deneyin."}), 429
        return jsonify({"error": error_msg}), 500
    except Exception as e:
        print(f"[generate-email] Error: {e}")
        return jsonify({"error": str(e)}), 500

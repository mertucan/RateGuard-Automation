from html import escape

from flask import Blueprint, request, jsonify
from services.calculation import calculate_renewal
from services.email_service import send_email
from services.gemini_service import generate_email_draft

email_bp = Blueprint("email", __name__)


@email_bp.route("/api/contact", methods=["POST"])
def contact_message():
    body = request.get_json() or {}
    name = (body.get("name") or "").strip()
    email = (body.get("email") or "").strip()
    company = (body.get("company") or "").strip()
    message = (body.get("message") or "").strip()

    if not name or not email or not message:
        return jsonify({"error": "Name, email and message are required."}), 400

    safe_name = escape(name)
    safe_email = escape(email)
    safe_company = escape(company)
    safe_message = escape(message).replace("\n", "<br>")

    body_html = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #136dec; padding: 24px; border-radius: 12px 12px 0 0;">
        <h1 style="color: #ffffff; margin: 0; font-size: 20px;">RateGuard Contact Request</h1>
      </div>
      <div style="background: #ffffff; padding: 28px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
        <p style="margin: 0 0 8px; color: #334155;"><strong>Name:</strong> {safe_name}</p>
        <p style="margin: 0 0 8px; color: #334155;"><strong>Email:</strong> {safe_email}</p>
        <p style="margin: 0 0 16px; color: #334155;"><strong>Company:</strong> {safe_company or "Not provided"}</p>
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; color: #0f172a; line-height: 1.6;">
          {safe_message}
        </div>
      </div>
    </div>
    """
    sent = send_email(
        "mertucan44@gmail.com",
        f"RateGuard contact request from {name}",
        body_html,
        body_text=f"Name: {name}\nEmail: {email}\nCompany: {company or 'Not provided'}\n\n{message}",
    )
    if not sent:
        return jsonify({"error": "Email service is not configured."}), 503
    return jsonify({"ok": True})


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

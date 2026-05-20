from html import escape

from flask import Blueprint, g, jsonify, request

from services.calculation import calculate_renewal
from services.auth_middleware import login_required
from services.email_service import render_email, send_email
from services.gemini_service import generate_email_draft
from routes.contracts import _get_scoped_contract

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

    body_html = render_email(
        title="New contact request",
        intro=[
            "A new contact request was submitted from the RateGuard website.",
            f"<strong>Message:</strong><br>{safe_message}",
        ],
        details=[
            ("Name", safe_name),
            ("Email", safe_email),
            ("Company", safe_company or "Not provided"),
        ],
    )
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
@login_required
def generate_email(contract_id):
    """Generate a contract renewal email draft with Gemini."""
    try:
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
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
            return jsonify({"error": "The AI quota limit has been reached. Please wait a few minutes and try again."}), 429
        return jsonify({"error": error_msg}), 500
    except Exception as e:
        print(f"[generate-email] Error: {e}")
        return jsonify({"error": str(e)}), 500

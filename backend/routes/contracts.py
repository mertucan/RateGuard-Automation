import uuid
from datetime import date, datetime, timedelta
import re

from flask import Blueprint, g, jsonify, request, send_file
from services.auth_middleware import login_required, role_required
from services.pdf_naming import addendum_download_name
from services.supabase_client import supabase

contracts_bp = Blueprint("contracts", __name__)


def _drop_missing_column(payload, error_text):
    """Drop the missing column mentioned in a PostgREST PGRST204 error.

    Example message:
      Could not find the 'inflation_data_source' column of 'contracts' in the schema cache
    """
    if not payload or not error_text:
        return False
    if "PGRST204" not in error_text:
        return False
    m = re.search(r"Could not find the '([^']+)' column", error_text)
    if not m:
        return False
    col = m.group(1)
    if col in payload:
        payload.pop(col, None)
        return True
    return False


def _supabase_insert_with_fallback(table_name, payload, max_retries=8):
    data = dict(payload or {})
    last_exc = None
    for _ in range(max_retries):
        try:
            return supabase.table(table_name).insert(data).execute()
        except Exception as exc:
            last_exc = exc
            text = str(exc)
            if _drop_missing_column(data, text):
                continue
            raise
    raise last_exc


def _supabase_update_with_fallback(table_name, payload, match_col, match_val, max_retries=8):
    data = dict(payload or {})
    last_exc = None
    for _ in range(max_retries):
        try:
            return (
                supabase.table(table_name)
                .update(data)
                .eq(match_col, match_val)
                .execute()
            )
        except Exception as exc:
            last_exc = exc
            text = str(exc)
            if _drop_missing_column(data, text):
                continue
            raise
    raise last_exc


@contracts_bp.route("/api/contracts", methods=["GET"])
@login_required
def list_contracts():
    user = g.current_user
    company_id = request.args.get("company_id")
    tenant_company_id = request.args.get("tenant_company_id")
    pending = request.args.get("pending")
    end_date_from = request.args.get("end_date_from")
    end_date_to = request.args.get("end_date_to")

    try:
        query = supabase.table("contracts").select(
            "*, companies!contracts_company_id_fkey(company_name, authorized_email, is_tenant)"
        )

        # Enforce security filtering based on user role
        if user["role"] in ["company_admin", "finance", "sales"]:
            query = query.eq("tenant_company_id", user["company_id"])
        elif user["role"] in ("client", "user"):
            query = query.eq("company_id", user["company_id"])

        if company_id:
            query = query.eq("company_id", company_id)

        if tenant_company_id:
            query = query.eq("tenant_company_id", tenant_company_id)

        if pending == "true":
            cutoff = (date.today() + timedelta(days=60)).isoformat()
            query = query.lte("end_date", cutoff)

        if end_date_from:
            query = query.gte("end_date", end_date_from)
        if end_date_to:
            query = query.lte("end_date", end_date_to)

        result = query.order("end_date", desc=False).execute()
        return jsonify(result.data)
    except Exception as e:
        print(f"[contracts] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/approved-agreements", methods=["GET"])
@login_required
def list_approved_agreements():
    user = g.current_user
    select_query = "*, tenant_company:companies!contracts_tenant_company_id_fkey(id, company_name), client_company:companies!contracts_company_id_fkey(id, company_name, authorized_email)"

    try:
        query = supabase.table("contracts").select(select_query)

        if user["role"] == "super_admin":
            query = query.eq("status", "client_approved")
        elif user["role"] == "company_admin":
            company_id = user["company_id"]
            query = query.eq("status", "client_approved").or_(
                f"tenant_company_id.eq.{company_id},company_id.eq.{company_id}"
            )
        else:
            query = query.eq("status", "client_approved").eq(
                "company_id", user["company_id"]
            )

        result = query.order("approved_at", desc=True).execute()
        return jsonify(result.data), 200
    except Exception as e:
        print(f"[approved-agreements] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>", methods=["GET"])
def get_contract(contract_id):
    try:
        result = (
            supabase.table("contracts")
            .select(
                "*, companies!contracts_company_id_fkey(company_name, authorized_email, communication_language)"
            )
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        return jsonify(result.data[0] if result.data else None)
    except Exception as e:
        print(f"[contract detail] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts", methods=["POST"])
def create_contract():
    body = request.get_json()

    end_date = body.get("end_date")
    if not end_date:  # Convert empty strings to None to prevent DB cast errors
        end_date = None

    data = {
        "id": str(uuid.uuid4()),
        "company_id": body["company_id"],
        "tenant_company_id": body.get("tenant_company_id"),
        "previous_amount": body["previous_amount"],
        "currency": body.get("currency", "TRY"),
        "contract_type": body.get("contract_type", "service_contract"),
        "end_date": end_date,
        "inflation_base_rule": body.get("inflation_base_rule", "TUFE"),
        "max_increase_limit": body.get("max_increase_limit"),
        "inflation_data_source": body.get("inflation_data_source", "tcmb_evds"),
        "inflation_source_name": body.get("inflation_source_name", "TCMB EVDS"),
        "inflation_source_institution": body.get(
            "inflation_source_institution",
            "Central Bank of the Republic of Turkiye (TCMB)",
        ),
        "inflation_source_method": body.get("inflation_source_method", "Official EVDS API"),
        "status": "active",
    }

    try:
        result = _supabase_insert_with_fallback("contracts", data)
        new_contract = result.data[0]

        # Send creation email
        try:
            # Get company and tenant info
            client_company_res = (
                supabase.table("companies")
                .select("company_name, authorized_email")
                .eq("id", body["company_id"])
                .limit(1)
                .execute()
            )

            client_email = (
                client_company_res.data[0].get("authorized_email")
                if client_company_res.data
                else None
            )
            client_company_name = (
                client_company_res.data[0].get("company_name")
                if client_company_res.data
                else None
            )

            tenant_company_name = "RateGuard"  # default
            if body.get("tenant_company_id"):
                tenant_company_res = (
                    supabase.table("companies")
                    .select("company_name")
                    .eq("id", body["tenant_company_id"])
                    .limit(1)
                    .execute()
                )
                tenant_company_name = (
                    tenant_company_res.data[0].get("company_name", "RateGuard")
                    if tenant_company_res.data
                    else "RateGuard"
                )

            from services.email_service import send_contract_created_email

            if client_email:
                send_contract_created_email(
                    client_email,
                    tenant_company_name,
                    client_company_name,
                    new_contract["id"],
                    new_contract["previous_amount"],
                    new_contract["end_date"],
                )
        except Exception as email_err:
            print(f"[contracts create] Email send error: {email_err}")

        return jsonify(new_contract), 201
    except Exception as e:
        print(f"[contracts create] Error: {e}")
        # The frontend API wrapper automatically extracts `json.error` or `json.message` from 400+ responses
        return jsonify({"error": str(e)}), 400


@contracts_bp.route("/api/contracts/<contract_id>", methods=["PUT"])
def update_contract(contract_id):
    body = request.get_json()
    allowed = [
        "previous_amount",
        "currency",
        "contract_type",
        "end_date",
        "inflation_base_rule",
        "max_increase_limit",
        "inflation_data_source",
        "inflation_source_name",
        "inflation_source_institution",
        "inflation_source_method",
        "company_id",
        "status",
        "new_amount",
        "applied_adjustment",
        "rejection_notes",
    ]
    data = {k: v for k, v in body.items() if k in allowed}
    try:
        result = _supabase_update_with_fallback("contracts", data, "id", contract_id)
        return jsonify(result.data[0])
    except Exception as e:
        print(f"[contracts update] Error: {e}")
        return jsonify({"error": str(e)}), 400


@contracts_bp.route("/api/contracts/<contract_id>/save-draft", methods=["POST"])
@login_required
def save_draft(contract_id):
    """Save contract values as draft and log the action."""
    body = request.get_json()
    allowed = [
        "previous_amount",
        "currency",
        "contract_type",
        "end_date",
        "inflation_base_rule",
        "max_increase_limit",
        "inflation_data_source",
        "inflation_source_name",
        "inflation_source_institution",
        "inflation_source_method",
        "new_amount",
        "applied_adjustment",
    ]
    data = {k: v for k, v in body.items() if k in allowed}
    data["status"] = "draft"
    try:
        result = _supabase_update_with_fallback("contracts", data, "id", contract_id)
        return jsonify(result.data[0])
    except Exception as e:
        print(f"[save-draft] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/reject", methods=["POST"])
@login_required
def reject_contract(contract_id):
    """Reject contract renewal and log the action."""
    body = request.get_json() or {}
    data = {
        "status": "rejected",
        "rejection_notes": body.get("rejection_notes", ""),
    }
    try:
        result = (
            supabase.table("contracts").update(data).eq("id", contract_id).execute()
        )

        from routes.audit_logs import log_audit

        user = g.current_user
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="reject",
            entity_type="contract",
            entity_id=contract_id,
            details={"rejection_notes": body.get("rejection_notes", "")},
        )

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[reject] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/approve", methods=["POST"])
@role_required("finance", "company_admin", "super_admin")
def approve_contract(contract_id):
    """Internal approval of contract renewal. Emails go out on client-approve step."""
    body = request.get_json() or {}
    data = {
        "status": "approved",
        "new_amount": body.get("new_amount"),
        "applied_adjustment": body.get("applied_adjustment"),
        "approved_at": datetime.utcnow().isoformat(),
    }
    if "inflation_base_rule" in body:
        data["inflation_base_rule"] = body.get("inflation_base_rule")
    if "max_increase_limit" in body:
        data["max_increase_limit"] = body.get("max_increase_limit")
    for key in (
        "inflation_data_source",
        "inflation_source_name",
        "inflation_source_institution",
        "inflation_source_method",
    ):
        if key in body:
            data[key] = body.get(key)
    try:
        result = _supabase_update_with_fallback("contracts", data, "id", contract_id)

        from routes.audit_logs import log_audit

        user = g.current_user
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="approve",
            entity_type="contract",
            entity_id=contract_id,
            details={
                "new_amount": body.get("new_amount"),
                "applied_adjustment": body.get("applied_adjustment"),
            },
        )

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[approve] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/send-to-client", methods=["POST"])
@role_required("finance", "company_admin", "super_admin", "sales")
def send_to_client(contract_id):
    """Mark contract as pending_client and send a review notification to the client."""
    try:
        data = {
            "status": "pending_client",
            "sent_to_client_at": datetime.utcnow().isoformat(),
        }

        # Request data might include custom email subject and body
        req_data = request.json or {}
        email_subject = req_data.get("email_subject")
        email_body = req_data.get("email_body")

        if "new_amount" in req_data:
            data["new_amount"] = req_data["new_amount"]
        if "applied_adjustment" in req_data:
            data["applied_adjustment"] = req_data["applied_adjustment"]
        if "inflation_base_rule" in req_data:
            data["inflation_base_rule"] = req_data["inflation_base_rule"]
        if "max_increase_limit" in req_data:
            data["max_increase_limit"] = req_data["max_increase_limit"]
        for key in (
            "inflation_data_source",
            "inflation_source_name",
            "inflation_source_institution",
            "inflation_source_method",
        ):
            if key in req_data:
                data[key] = req_data[key]

        result = _supabase_update_with_fallback("contracts", data, "id", contract_id)

        # Fetch full contract + both company names for the email
        contract_res = (
            supabase.table("contracts")
            .select(
                "*, "
                "companies!contracts_company_id_fkey(company_name, authorized_email), "
                "tenant_companies:companies!contracts_tenant_company_id_fkey(company_name)"
            )
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        client_email = contract.get("companies", {}).get("authorized_email", "")
        client_company = contract.get("companies", {}).get("company_name", "")
        tenant_company = contract.get("tenant_companies", {}).get("company_name", "")
        new_amount = contract.get("new_amount")

        from routes.audit_logs import log_audit

        user = g.current_user
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="send_to_client",
            entity_type="contract",
            entity_id=contract_id,
            details={"client_email": client_email},
        )

        try:
            from services.email_service import send_client_review_email

            if client_email:
                send_client_review_email(
                    client_email,
                    client_company,
                    tenant_company,
                    contract_id,
                    new_amount,
                    custom_subject=email_subject,
                    custom_body=email_body,
                    sender_name=user.get("full_name"),
                    sender_email=user.get("email"),
                    inflation_source_name=contract.get("inflation_source_name"),
                    inflation_source_institution=contract.get("inflation_source_institution"),
                    inflation_source_method=contract.get("inflation_source_method"),
                )
        except Exception as email_err:
            print(f"[send-to-client] Email send error (non-blocking): {email_err}")

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[send-to-client] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/client-approve", methods=["POST"])
@role_required("client", "user", "super_admin", "company_admin")
def client_approve(contract_id):
    """Client approves the contract renewal; sends mutual confirmation email with PDF."""
    try:
        user = g.current_user

        # Fetch contract with both company records
        contract_res = (
            supabase.table("contracts")
            .select(
                "*, "
                "companies!contracts_company_id_fkey(company_name, authorized_email), "
                "tenant_companies:companies!contracts_tenant_company_id_fkey(company_name)"
            )
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        # super_admin and company_admin can approve on behalf of any client
        # For regular client/user roles, verify they belong to the contract's client company
        if user.get("role") not in ("super_admin", "company_admin"):
            if user.get("company_id") != contract.get("company_id"):
                return jsonify({"error": "Forbidden: company mismatch"}), 403

        data = {
            "status": "client_approved",
            "approved_at": datetime.utcnow().isoformat(),
        }
        result = (
            supabase.table("contracts").update(data).eq("id", contract_id).execute()
        )

        client_company = contract.get("companies", {}).get("company_name", "")
        tenant_company = contract.get("tenant_companies", {}).get("company_name", "")
        client_email = contract.get("companies", {}).get("authorized_email", "")
        new_amount = contract.get("new_amount")

        from routes.audit_logs import log_audit

        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="client_approve",
            entity_type="contract",
            entity_id=contract_id,
            details={"new_amount": new_amount},
        )

        try:
            from services.calculation import calculate_renewal
            from services.email_service import send_mutual_approval_email
            from services.pdf_generator import generate_addendum_pdf

            calc = calculate_renewal(contract_id)
            pdf_buf = generate_addendum_pdf(calc)
            pdf_bytes = pdf_buf.read()
            filename = addendum_download_name(contract_id)
            if client_email:
                send_mutual_approval_email(
                    client_email,
                    client_company,
                    tenant_company,
                    new_amount,
                    pdf_bytes=pdf_bytes,
                    pdf_filename=filename,
                )
        except Exception as email_err:
            print(f"[client-approve] Email send error (non-blocking): {email_err}")

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[client-approve] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/client-reject", methods=["POST"])
@role_required("client", "user", "super_admin", "company_admin")
def client_reject(contract_id):
    """Client rejects the contract renewal with a mandatory reason."""
    try:
        user = g.current_user
        body = request.get_json() or {}
        reason = body.get("reason", "").strip()

        if not reason:
            return jsonify({"error": "Rejection reason is required"}), 400

        # Fetch contract to verify company ownership before mutating
        contract_res = (
            supabase.table("contracts")
            .select("company_id")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        # super_admin and company_admin can reject on behalf of any client
        if user.get("role") not in ("super_admin", "company_admin"):
            if user.get("company_id") != contract.get("company_id"):
                return jsonify({"error": "Forbidden: company mismatch"}), 403

        data = {
            "status": "client_rejected",
            "client_rejection_reason": reason,
        }
        result = (
            supabase.table("contracts").update(data).eq("id", contract_id).execute()
        )

        from routes.audit_logs import log_audit

        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="client_reject",
            entity_type="contract",
            entity_id=contract_id,
            details={"reason": reason},
        )

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[client-reject] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/notify-sales", methods=["POST"])
@role_required("finance", "company_admin", "super_admin")
def notify_sales(contract_id):
    """Finance notifies Sales team that contract preparation is done."""
    try:
        user = g.current_user

        contract_res = (
            supabase.table("contracts")
            .select("*, companies!contracts_company_id_fkey(company_name)")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        client_company_name = contract.get("companies", {}).get("company_name", "—")
        new_amount = contract.get("new_amount")
        previous_amount = contract.get("previous_amount")
        end_date = contract.get("end_date", "—")
        inflation_rule = contract.get("inflation_base_rule", "—")

        # Find all sales users in the same company
        sales_users_res = (
            supabase.table("users")
            .select("id, email, full_name")
            .eq("company_id", user["company_id"])
            .eq("role", "sales")
            .execute()
        )
        sales_users = sales_users_res.data or []

        if not sales_users:
            return jsonify(
                {"ok": True, "message": "No sales users found in your company."}
            ), 200

        from services.email_service import send_finance_ready_notification

        for su in sales_users:
            if su.get("email"):
                try:
                    send_finance_ready_notification(
                        to_email=su["email"],
                        sales_name=su.get("full_name", "Sales"),
                        finance_name=user.get("full_name", "Finance"),
                        client_company_name=client_company_name,
                        contract_id=contract_id,
                        previous_amount=previous_amount,
                        new_amount=new_amount,
                        end_date=end_date,
                        inflation_rule=inflation_rule,
                    )
                except Exception as email_err:
                    print(f"[notify-sales] Email error for {su['email']}: {email_err}")

        from routes.audit_logs import log_audit

        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="notify_sales",
            entity_type="contract",
            entity_id=contract_id,
            details={"sales_count": len(sales_users)},
        )

        return jsonify({"ok": True, "notified": len(sales_users)})
    except Exception as e:
        print(f"[notify-sales] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>", methods=["DELETE"])
def delete_contract(contract_id):
    supabase.table("contracts").delete().eq("id", contract_id).execute()
    return jsonify({"ok": True})


@contracts_bp.route("/api/ratebot/chat", methods=["POST"])
@login_required
def ratebot_chat():
    """RateBot: Gemini-powered contract analysis chatbot."""
    try:
        body = request.get_json() or {}
        message = body.get("message", "").strip()
        contract_id = body.get("contract_id")  # optional context
        history = body.get("history", [])  # list of {role, text}

        if not message:
            return jsonify({"error": "message is required"}), 400

        from services.gemini_service import ratebot_respond

        reply = ratebot_respond(
            message=message, contract_id=contract_id, history=history
        )
        return jsonify({"reply": reply})
    except Exception as e:
        print(f"[ratebot] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/approved-pdf", methods=["GET"])
@login_required
def get_approved_pdf(contract_id):
    try:
        from services.calculation import calculate_renewal
        from services.pdf_generator import generate_addendum_pdf

        calc = calculate_renewal(contract_id)
        pdf_buf = generate_addendum_pdf(calc)
        return send_file(
            pdf_buf,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=addendum_download_name(contract_id),
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

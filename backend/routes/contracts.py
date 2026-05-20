import uuid
from calendar import monthrange
from datetime import date, datetime, timedelta
import re

from flask import Blueprint, g, jsonify, request, send_file
from services.auth_middleware import login_required, role_required
from services.pdf_naming import addendum_download_name
from services.renewal_recommendations import (
    attach_renewal_recommendation,
    attach_renewal_recommendations,
)
from services.supabase_client import supabase

contracts_bp = Blueprint("contracts", __name__)

FINAL_STATUSES = {"client_approved", "cancelled"}


def _contract_scope_query():
    return supabase.table("contracts").select(
        "id, company_id, tenant_company_id, status"
    )


def _get_scoped_contract(contract_id, user):
    result = _contract_scope_query().eq("id", contract_id).limit(1).execute()
    contract = result.data[0] if result.data else None
    if not contract:
        return None, (jsonify({"error": "Contract not found"}), 404)

    role = user.get("role")
    user_company_id = str(user.get("company_id") or "")
    tenant_id = str(contract.get("tenant_company_id") or "")
    client_company_id = str(contract.get("company_id") or "")

    if role == "super_admin":
        return contract, None
    if role in ("company_admin", "finance", "sales") and user_company_id in (tenant_id, client_company_id):
        return contract, None
    if role == "user" and user_company_id and user_company_id == client_company_id:
        return contract, None

    return None, (jsonify({"error": "Insufficient permissions"}), 403)


def _require_status(contract, *statuses):
    if contract.get("status") not in statuses:
        return jsonify(
            {
                "error": "Invalid workflow state",
                "current_status": contract.get("status"),
                "allowed_statuses": list(statuses),
            }
        ), 409
    return None


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


def _add_months(d, months):
    month_index = d.month - 1 + int(months or 12)
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _current_amount(contract):
    return contract.get("new_amount") or contract.get("previous_amount")


def _version_sort_key(contract):
    return (
        str(contract.get("created_at") or ""),
        str(contract.get("approved_at") or ""),
        str(contract.get("end_date") or ""),
        str(contract.get("id") or ""),
    )


def _build_contract_lineage(all_contracts, contract_id):
    by_id = {str(c.get("id")): c for c in all_contracts if c.get("id")}
    if str(contract_id) not in by_id:
        return []

    connected_ids = {str(contract_id)}
    changed = True
    while changed:
        changed = False
        for c in all_contracts:
            cid = str(c.get("id") or "")
            parent_id = str(c.get("renewed_from_contract_id") or "")
            if not cid:
                continue
            if cid in connected_ids or parent_id in connected_ids:
                before = len(connected_ids)
                connected_ids.add(cid)
                if parent_id:
                    connected_ids.add(parent_id)
                changed = changed or len(connected_ids) != before

    chain = [by_id[cid] for cid in connected_ids if cid in by_id]
    chain.sort(key=_version_sort_key)
    child_parent_ids = {str(c.get("renewed_from_contract_id")) for c in chain if c.get("renewed_from_contract_id")}
    for index, c in enumerate(chain, start=1):
        c["version_number"] = index
        c["is_current_version"] = str(c.get("id")) not in child_parent_ids
    return chain


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
            company_scope = user["company_id"]
            query = query.or_(
                f"tenant_company_id.eq.{company_scope},company_id.eq.{company_scope}"
            )
        elif user["role"] == "user":
            query = query.eq("company_id", user["company_id"])
        elif user["role"] == "hr":
            return jsonify([])

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
        return jsonify(attach_renewal_recommendations(result.data))
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
        return jsonify(attach_renewal_recommendations(result.data)), 200
    except Exception as e:
        print(f"[approved-agreements] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/versions", methods=["GET"])
@login_required
def get_contract_versions(contract_id):
    user = g.current_user
    contract, error = _get_scoped_contract(contract_id, user)
    if error:
        return error

    try:
        select_query = (
            "*, "
            "tenant_company:companies!contracts_tenant_company_id_fkey(id, company_name), "
            "client_company:companies!contracts_company_id_fkey(id, company_name, authorized_email)"
        )
        query = supabase.table("contracts").select(select_query)
        if user["role"] == "super_admin":
            pass
        elif user["role"] in ("company_admin", "finance", "sales"):
            company_scope = user["company_id"]
            query = query.or_(
                f"tenant_company_id.eq.{company_scope},company_id.eq.{company_scope}"
            )
        elif user["role"] == "user":
            query = query.eq("company_id", user["company_id"])
        else:
            return jsonify([])

        rows = query.execute().data or []
        versions = _build_contract_lineage(rows, contract_id)
        if not versions and contract:
            versions = [contract]
        return jsonify(versions), 200
    except Exception as e:
        print(f"[contract versions] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/versions", methods=["POST"])
@role_required("sales", "finance", "company_admin", "super_admin")
def create_contract_version(contract_id):
    user = g.current_user
    body = request.get_json() or {}
    contract, error = _get_scoped_contract(contract_id, user)
    if error:
        return error

    try:
        full_res = (
            supabase.table("contracts")
            .select("*")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        source = full_res.data[0] if full_res.data else None
        if not source:
            return jsonify({"error": "Contract not found"}), 404

        if source.get("status") not in ("client_approved", "client_rejected", "cancelled"):
            return jsonify({"error": "Only finalized contracts can start a new version"}), 409

        if not body.get("allow_duplicate"):
            existing = (
                supabase.table("contracts")
                .select("id, status")
                .eq("renewed_from_contract_id", contract_id)
                .limit(1)
                .execute()
            )
            if existing.data:
                return jsonify({
                    "error": "A next version already exists",
                    "contract_id": existing.data[0]["id"],
                }), 409

        end_date = body.get("end_date")
        if not end_date and source.get("end_date"):
            try:
                end_date = _add_months(
                    date.fromisoformat(str(source.get("end_date"))[:10]),
                    source.get("auto_renew_term_months") or 12,
                ).isoformat()
            except (TypeError, ValueError):
                end_date = source.get("end_date")

        payload = {
            "id": str(uuid.uuid4()),
            "company_id": source.get("company_id"),
            "tenant_company_id": source.get("tenant_company_id"),
            "sales_rep_id": user["id"] if user.get("role") == "sales" else source.get("sales_rep_id"),
            "previous_amount": body.get("previous_amount") or _current_amount(source),
            "currency": body.get("currency") or source.get("currency") or "TRY",
            "contract_type": body.get("contract_type") or source.get("contract_type") or "service_contract",
            "end_date": end_date,
            "inflation_base_rule": body.get("inflation_base_rule") or source.get("inflation_base_rule") or "TUFE",
            "max_increase_limit": body.get("max_increase_limit", source.get("max_increase_limit")),
            "inflation_data_source": body.get("inflation_data_source") or source.get("inflation_data_source") or "tcmb_evds",
            "inflation_source_name": body.get("inflation_source_name") or source.get("inflation_source_name") or "TCMB EVDS",
            "inflation_source_institution": body.get("inflation_source_institution") or source.get("inflation_source_institution"),
            "inflation_source_method": body.get("inflation_source_method") or source.get("inflation_source_method"),
            "status": "draft",
            "auto_renew_enabled": bool(body.get("auto_renew_enabled", source.get("auto_renew_enabled", False))),
            "auto_renew_term_months": int(body.get("auto_renew_term_months") or source.get("auto_renew_term_months") or 12),
            "renewed_from_contract_id": contract_id,
        }

        created = _supabase_insert_with_fallback("contracts", payload)
        row = created.data[0]

        try:
            from routes.audit_logs import log_audit

            log_audit(
                user_id=user["id"],
                user_name=user["full_name"],
                action="create_contract_version",
                entity_type="contract",
                entity_id=row["id"],
                details={"renewed_from_contract_id": contract_id},
            )
        except Exception as audit_err:
            print(f"[create contract version] Audit error: {audit_err}")

        return jsonify(row), 201
    except Exception as e:
        print(f"[create contract version] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/ai-analysis", methods=["GET"])
@login_required
def get_contract_ai_analysis(contract_id):
    user = g.current_user
    _, error = _get_scoped_contract(contract_id, user)
    if error:
        return error

    try:
        from services.contract_ai_analysis import (
            build_contract_ai_analysis,
            get_cached_contract_ai_analysis,
        )

        cached = get_cached_contract_ai_analysis(contract_id)
        if cached:
            return jsonify(cached), 200
        return jsonify(build_contract_ai_analysis(contract_id, user=user, persist=False)), 200
    except Exception as e:
        print(f"[contract ai analysis] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/ai-analysis", methods=["POST"])
@login_required
def generate_contract_ai_analysis(contract_id):
    user = g.current_user
    _, error = _get_scoped_contract(contract_id, user)
    if error:
        return error

    try:
        from services.contract_ai_analysis import build_contract_ai_analysis

        analysis = build_contract_ai_analysis(contract_id, user=user, persist=True)

        try:
            from routes.audit_logs import log_audit

            log_audit(
                user_id=user["id"],
                user_name=user["full_name"],
                action="generate_contract_ai_analysis",
                entity_type="contract",
                entity_id=contract_id,
                details={
                    "source": analysis.get("source"),
                    "previous_contract_id": analysis.get("previous_contract_id"),
                    "risk_level": (analysis.get("risk") or {}).get("level"),
                },
            )
        except Exception as audit_err:
            print(f"[contract ai analysis] Audit error: {audit_err}")

        return jsonify(analysis), 200
    except Exception as e:
        print(f"[contract ai analysis] Generate error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>", methods=["GET"])
@login_required
def get_contract(contract_id):
    try:
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
        result = (
            supabase.table("contracts")
            .select(
                "*, companies!contracts_company_id_fkey(company_name, authorized_email, communication_language)"
            )
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        return jsonify(
            attach_renewal_recommendation(result.data[0], use_ai=True)
            if result.data
            else None
        )
    except Exception as e:
        print(f"[contract detail] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts", methods=["POST"])
@role_required("sales", "finance", "company_admin", "super_admin")
def create_contract():
    body = request.get_json()
    user = g.current_user

    end_date = body.get("end_date")
    if not end_date:  # Convert empty strings to None to prevent DB cast errors
        end_date = None

    data = {
        "id": str(uuid.uuid4()),
        "company_id": body["company_id"],
        "tenant_company_id": body.get("tenant_company_id") or user.get("company_id"),
        "sales_rep_id": user["id"] if user.get("role") == "sales" else body.get("sales_rep_id"),
        "previous_amount": body["previous_amount"],
        "currency": body.get("currency", "TRY"),
        "contract_type": body.get("contract_type", "service_contract"),
        "end_date": end_date,
        "auto_renew_enabled": bool(body.get("auto_renew_enabled", False)),
        "auto_renew_term_months": int(body.get("auto_renew_term_months") or 12),
        "inflation_base_rule": body.get("inflation_base_rule", "TUFE"),
        "max_increase_limit": body.get("max_increase_limit"),
        "inflation_data_source": body.get("inflation_data_source", "tcmb_evds"),
        "inflation_source_name": body.get("inflation_source_name", "TCMB EVDS"),
        "inflation_source_institution": body.get(
            "inflation_source_institution",
            "Central Bank of the Republic of Turkiye (TCMB)",
        ),
        "inflation_source_method": body.get("inflation_source_method", "Official EVDS API"),
        "status": "draft",
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
@role_required("finance", "company_admin", "super_admin")
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
        "auto_renew_enabled",
        "auto_renew_term_months",
    ]
    data = {k: v for k, v in body.items() if k in allowed}
    try:
        contract, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
        if contract.get("status") in FINAL_STATUSES:
            return jsonify({"error": "Finalized contracts cannot be edited"}), 409
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
        "auto_renew_enabled",
        "auto_renew_term_months",
    ]
    data = {k: v for k, v in body.items() if k in allowed}
    data["status"] = "draft"
    try:
        contract, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
        if g.current_user.get("role") == "user":
            return jsonify({"error": "Insufficient permissions"}), 403
        if contract.get("status") in FINAL_STATUSES:
            return jsonify({"error": "Finalized contracts cannot be edited"}), 409
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
        "status": "cancelled",
        "rejection_notes": body.get("rejection_notes", ""),
    }
    try:
        contract, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
        if g.current_user.get("role") not in ("company_admin", "super_admin"):
            return jsonify({"error": "Only company admins can cancel contracts"}), 403
        result = (
            supabase.table("contracts").update(data).eq("id", contract_id).execute()
        )

        from routes.audit_logs import log_audit

        user = g.current_user
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="cancel",
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
    """Approve the current workflow step: finance calculation first, then admin sending approval."""
    body = request.get_json() or {}
    user = g.current_user
    contract, error = _get_scoped_contract(contract_id, user)
    if error:
        return error

    role = user.get("role")
    current_status = contract.get("status")
    if role == "finance":
        status_error = _require_status(
            contract,
            "draft",
            "finance_review",
            "finance_revision_requested",
            "admin_revision_requested",
        )
        next_status = "finance_approved"
        audit_action = "finance_approve"
    elif role in ("company_admin", "super_admin"):
        status_error = _require_status(contract, "finance_approved", "admin_review")
        next_status = "admin_approved"
        audit_action = "admin_approve"
    else:
        status_error = jsonify({"error": "Insufficient permissions"}), 403
        next_status = current_status
        audit_action = "approve"

    if status_error:
        return status_error

    data = {
        "status": next_status,
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

        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action=audit_action,
            entity_type="contract",
            entity_id=contract_id,
            details={
                "new_amount": body.get("new_amount"),
                "applied_adjustment": body.get("applied_adjustment"),
            },
        )

        try:
            from services.notification_service import notify_company_users

            tenant_company_id = contract.get("tenant_company_id") or user.get("company_id")
            if next_status == "finance_approved":
                notify_company_users(
                    tenant_company_id,
                    "Finance approval completed",
                    "A contract renewal calculation is ready for admin approval.",
                    roles=("company_admin",),
                    contract_id=contract_id,
                    action_url=f"/renewal-review/{contract_id}",
                    category="contract_workflow",
                    notification_type="success",
                    event_key=f"finance-approved:{contract_id}",
                )
            elif next_status == "admin_approved":
                notify_company_users(
                    tenant_company_id,
                    "Contract ready to send",
                    "Admin approval is complete. Sales can now send the renewal to the client.",
                    roles=("sales", "company_admin"),
                    contract_id=contract_id,
                    action_url=f"/renewal-review/{contract_id}",
                    category="contract_workflow",
                    notification_type="success",
                    event_key=f"admin-approved:{contract_id}",
                )
        except Exception as notification_err:
            print(f"[approve] Notification error: {notification_err}")

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[approve] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/send-to-client", methods=["POST"])
@role_required("company_admin", "super_admin", "sales")
def send_to_client(contract_id):
    """Mark contract as sent_to_client and send a review notification to the client."""
    try:
        user = g.current_user
        contract_row, error = _get_scoped_contract(contract_id, user)
        if error:
            return error
        status_error = _require_status(contract_row, "admin_approved")
        if status_error:
            return status_error

        data = {
            "status": "sent_to_client",
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
            from services.notification_service import notify_company_users

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
            notify_company_users(
                contract.get("company_id"),
                "Contract ready for review",
                f"{tenant_company or 'Your partner'} sent a contract renewal for your review.",
                roles=("company_admin", "user"),
                contract_id=contract_id,
                action_url=f"/renewal-review/{contract_id}",
                category="client_review",
                notification_type="info",
                event_key=f"sent-to-client:{contract_id}",
            )
        except Exception as email_err:
            print(f"[send-to-client] Email send error (non-blocking): {email_err}")

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[send-to-client] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/client-approve", methods=["POST"])
@role_required("user", "company_admin")
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

        if str(user.get("company_id")) != str(contract.get("company_id")):
            return jsonify({"error": "Forbidden: company mismatch"}), 403
        if contract.get("status") != "sent_to_client":
            return jsonify({"error": "Contract is not waiting for client approval"}), 409

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
            from services.notification_service import notify_company_users
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
                    contract_id=contract_id,
                )
            notify_company_users(
                contract.get("tenant_company_id"),
                "Client approved the renewal",
                f"{client_company or 'The client'} approved the contract renewal.",
                roles=("company_admin", "finance", "sales"),
                contract_id=contract_id,
                action_url=f"/renewal-review/{contract_id}",
                category="client_decision",
                notification_type="success",
                event_key=f"client-approved:{contract_id}",
            )
        except Exception as email_err:
            print(f"[client-approve] Email send error (non-blocking): {email_err}")

        return jsonify(result.data[0])
    except Exception as e:
        print(f"[client-approve] Error: {e}")
        return jsonify({"error": str(e)}), 500


@contracts_bp.route("/api/contracts/<contract_id>/client-reject", methods=["POST"])
@role_required("user", "company_admin")
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
            .select("company_id, tenant_company_id")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        contract = contract_res.data[0] if contract_res.data else {}

        if str(user.get("company_id")) != str(contract.get("company_id")):
            return jsonify({"error": "Forbidden: company mismatch"}), 403
        if contract.get("status") != "sent_to_client":
            return jsonify({"error": "Contract is not waiting for client approval"}), 409

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

        try:
            from services.notification_service import notify_company_users

            notify_company_users(
                contract.get("tenant_company_id"),
                "Client rejected the renewal",
                "The client rejected the proposed renewal. Review the rejection reason and follow up.",
                roles=("company_admin", "finance", "sales"),
                contract_id=contract_id,
                action_url=f"/renewal-review/{contract_id}",
                category="client_decision",
                notification_type="danger",
                event_key=f"client-rejected:{contract_id}",
            )
        except Exception as notification_err:
            print(f"[client-reject] Notification error: {notification_err}")

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
        _, error = _get_scoped_contract(contract_id, user)
        if error:
            return error

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
                try:
                    from services.notification_service import notify_user

                    notify_user(
                        su.get("id"),
                        "Contract ready for sales action",
                        f"Finance completed preparation for {client_company_name}.",
                        company_id=user.get("company_id"),
                        contract_id=contract_id,
                        action_url=f"/renewal-review/{contract_id}",
                        category="contract_workflow",
                        notification_type="info",
                        event_key=f"notify-sales:{contract_id}:user:{su.get('id')}",
                    )
                except Exception as notification_err:
                    print(f"[notify-sales] Notification error for {su['email']}: {notification_err}")

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
@role_required("company_admin", "super_admin")
def delete_contract(contract_id):
    user = g.current_user
    contract, error = _get_scoped_contract(contract_id, user)
    if error:
        return error
    payload = {"status": "cancelled", "rejection_notes": "Cancelled by admin"}
    supabase.table("contracts").update(payload).eq("id", contract_id).execute()
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
        if contract_id:
            _, error = _get_scoped_contract(contract_id, g.current_user)
            if error:
                return error

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
        _, error = _get_scoped_contract(contract_id, g.current_user)
        if error:
            return error
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

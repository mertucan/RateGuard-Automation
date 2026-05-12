from flask import Blueprint, g, jsonify, request

from routes.audit_logs import log_audit
from services.auth_middleware import login_required, role_required
from services.automation_service import (
    add_contract_approval_log,
    list_contract_approval_logs,
    run_renewal_automation,
    get_company_automation_settings,
    upsert_company_automation_settings,
)
from services.supabase_client import supabase

automation_bp = Blueprint("automation", __name__)


@automation_bp.route("/api/automation/settings", methods=["GET"])
@role_required("company_admin", "super_admin")
def get_automation_settings():
    user = g.current_user
    company_id = request.args.get("company_id")
    if user["role"] != "super_admin":
        company_id = user.get("company_id")
    if not company_id:
        return jsonify({"error": "company_id is required"}), 400
    return jsonify(get_company_automation_settings(company_id))


@automation_bp.route("/api/automation/settings", methods=["PUT"])
@role_required("company_admin", "super_admin")
def update_automation_settings():
    user = g.current_user
    body = request.get_json() or {}
    company_id = body.get("company_id")
    if user["role"] != "super_admin":
        company_id = user.get("company_id")
    if not company_id:
        return jsonify({"error": "company_id is required"}), 400

    try:
        updated = upsert_company_automation_settings(company_id, body)
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="update_automation_settings",
            entity_type="company_settings",
            entity_id=company_id,
            details=updated,
        )
        return jsonify(updated)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@automation_bp.route("/api/automation/run-renewal-check", methods=["POST"])
@role_required("company_admin", "super_admin")
def run_automation_now():
    user = g.current_user
    try:
        results = run_renewal_automation(
            triggered_by=f"user:{user['id']}",
            summary_to_email=user.get("email"),
        )
        log_audit(
            user_id=user["id"],
            user_name=user["full_name"],
            action="run_renewal_automation",
            entity_type="automation",
            details=results,
        )
        return jsonify(results)
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@automation_bp.route("/api/contracts/<contract_id>/approval-logs", methods=["GET"])
@login_required
def get_contract_approval_logs(contract_id):
    user = g.current_user
    try:
        contract_res = (
            supabase.table("contracts")
            .select("id, tenant_company_id, company_id")
            .eq("id", contract_id)
            .limit(1)
            .execute()
        )
        if not contract_res.data:
            return jsonify({"error": "Contract not found"}), 404

        contract = contract_res.data[0]
        if user["role"] != "super_admin":
            allowed = {
                str(contract.get("tenant_company_id")),
                str(contract.get("company_id")),
            }
            if str(user.get("company_id")) not in allowed:
                return jsonify({"error": "Insufficient permissions"}), 403

        return jsonify(list_contract_approval_logs(contract_id))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 500


@automation_bp.route("/api/contracts/<contract_id>/approval-decision", methods=["POST"])
@role_required("company_admin", "super_admin")
def approval_decision(contract_id):
    user = g.current_user
    body = request.get_json() or {}
    decision = (body.get("decision") or "").strip().lower()
    notes = (body.get("notes") or "").strip() or None
    if decision not in ("approve", "reject", "revise"):
        return jsonify({"error": "decision must be approve, reject or revise"}), 400

    contract_res = (
        supabase.table("contracts")
        .select("id, status, tenant_company_id")
        .eq("id", contract_id)
        .limit(1)
        .execute()
    )
    if not contract_res.data:
        return jsonify({"error": "Contract not found"}), 404
    contract = contract_res.data[0]

    if user["role"] != "super_admin" and str(contract.get("tenant_company_id")) != str(
        user.get("company_id")
    ):
        return jsonify({"error": "You can only review contracts in your company"}), 403

    if contract.get("status") != "pending_admin_approval":
        return jsonify({"error": "Contract is not waiting for admin approval"}), 409

    if decision == "approve":
        next_status = "approved"
    elif decision == "reject":
        next_status = "rejected"
    else:
        next_status = "draft"

    payload = {"status": next_status}
    if notes and decision in ("reject", "revise"):
        payload["rejection_notes"] = notes

    updated = (
        supabase.table("contracts")
        .update(payload)
        .eq("id", contract_id)
        .execute()
    )

    add_contract_approval_log(
        contract_id=contract_id,
        action=f"admin_{decision}",
        actor_user_id=user["id"],
        actor_name=user.get("full_name"),
        notes=notes,
        metadata={"previous_status": "pending_admin_approval", "new_status": next_status},
    )
    log_audit(
        user_id=user["id"],
        user_name=user["full_name"],
        action=f"admin_{decision}",
        entity_type="contract_approval",
        entity_id=contract_id,
        details={"notes": notes, "new_status": next_status},
    )

    return jsonify(updated.data[0] if updated.data else {"id": contract_id, **payload})

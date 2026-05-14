from calendar import monthrange
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone

from services.supabase_client import supabase
from services.email_service import (
    send_admin_approval_request_email,
    send_automation_summary_email,
    send_client_review_email,
)


DEFAULT_SETTINGS = {
    "auto_renewal_enabled": False,
    "require_admin_approval_before_auto_renew": True,
    "automation_email_enabled": True,
}


def _empty_tenant_aggregate():
    return {
        "checked": 0,
        "skipped": 0,
        "pending_admin_approval": 0,
        "auto_sent_to_client": 0,
        "renewed_created": 0,
        "emails_sent": 0,
    }


def get_company_admin_email(tenant_company_id):
    """Primary recipient for tenant automation mails: logged-in-equivalent company_admin user."""
    if not tenant_company_id:
        return None
    try:
        adm = (
            supabase.table("users")
            .select("email")
            .eq("company_id", tenant_company_id)
            .eq("role", "company_admin")
            .limit(1)
            .execute()
        )
        email = adm.data[0].get("email") if adm.data else None
        if email:
            return email
        fallback = (
            supabase.table("companies")
            .select("authorized_email")
            .eq("id", tenant_company_id)
            .limit(1)
            .execute()
        )
        row = fallback.data[0] if fallback.data else None
        return (row or {}).get("authorized_email") or None
    except Exception as exc:
        print(f"[automation] get_company_admin_email error: {exc}")
        return None


def get_company_automation_settings(company_id):
    if not company_id:
        return {**DEFAULT_SETTINGS}

    try:
        res = (
            supabase.table("company_settings")
            .select("*")
            .eq("company_id", company_id)
            .limit(1)
            .execute()
        )
        if not res.data:
            return {**DEFAULT_SETTINGS}
        row = res.data[0]
        return {
            "auto_renewal_enabled": bool(row.get("auto_renewal_enabled", False)),
            "require_admin_approval_before_auto_renew": bool(
                row.get("require_admin_approval_before_auto_renew", True)
            ),
            "automation_email_enabled": bool(row.get("automation_email_enabled", True)),
        }
    except Exception as exc:
        print(f"[automation] settings read error for {company_id}: {exc}")
        return {**DEFAULT_SETTINGS}


def upsert_company_automation_settings(company_id, data):
    if not company_id:
        raise ValueError("company_id is required")

    payload = {
        "company_id": company_id,
        "auto_renewal_enabled": bool(data.get("auto_renewal_enabled", False)),
        "require_admin_approval_before_auto_renew": bool(
            data.get("require_admin_approval_before_auto_renew", True)
        ),
        "automation_email_enabled": bool(data.get("automation_email_enabled", True)),
    }
    res = (
        supabase.table("company_settings")
        .upsert(payload, on_conflict="company_id")
        .execute()
    )
    return res.data[0] if res.data else payload


def list_contract_approval_logs(contract_id):
    result = (
        supabase.table("contract_approval_logs")
        .select("*")
        .eq("contract_id", contract_id)
        .order("created_at", desc=True)
        .execute()
    )
    return result.data or []


def add_contract_approval_log(
    contract_id, action, actor_user_id=None, actor_name=None, notes=None, metadata=None
):
    payload = {
        "contract_id": contract_id,
        "action": action,
        "actor_user_id": actor_user_id,
        "actor_name": actor_name,
        "notes": notes,
        "metadata": metadata or {},
    }
    supabase.table("contract_approval_logs").insert(payload).execute()


def _contract_is_final(status):
    return status in ("client_approved", "client_rejected", "cancelled")


def _tenant_key(tenant_company_id):
    if tenant_company_id is None:
        return "__none__"
    return str(tenant_company_id)


def _add_months(d, months):
    month_index = d.month - 1 + int(months or 12)
    year = d.year + month_index // 12
    month = month_index % 12 + 1
    day = min(d.day, monthrange(year, month)[1])
    return date(year, month, day)


def _create_next_period_contract(contract, triggered_by):
    existing = (
        supabase.table("contracts")
        .select("id")
        .eq("renewed_from_contract_id", contract["id"])
        .limit(1)
        .execute()
    )
    if existing.data:
        return None

    try:
        end_date = date.fromisoformat(str(contract.get("end_date"))[:10])
    except (TypeError, ValueError):
        return None

    next_end_date = _add_months(end_date, contract.get("auto_renew_term_months") or 12)
    payload = {
        "company_id": contract["company_id"],
        "tenant_company_id": contract.get("tenant_company_id"),
        "sales_rep_id": contract.get("sales_rep_id"),
        "previous_amount": contract.get("new_amount") or contract.get("previous_amount"),
        "currency": contract.get("currency") or "TRY",
        "contract_type": contract.get("contract_type") or "service_contract",
        "end_date": next_end_date.isoformat(),
        "inflation_base_rule": contract.get("inflation_base_rule") or "TUFE",
        "max_increase_limit": contract.get("max_increase_limit"),
        "inflation_data_source": contract.get("inflation_data_source") or "tcmb_evds",
        "inflation_source_name": contract.get("inflation_source_name") or "TCMB EVDS",
        "inflation_source_institution": contract.get("inflation_source_institution"),
        "inflation_source_method": contract.get("inflation_source_method"),
        "status": "draft",
        "auto_renew_enabled": bool(contract.get("auto_renew_enabled")),
        "auto_renew_term_months": contract.get("auto_renew_term_months") or 12,
        "renewed_from_contract_id": contract["id"],
    }
    created = supabase.table("contracts").insert(payload).execute()
    row = created.data[0] if created.data else None
    if row:
        add_contract_approval_log(
            contract_id=row["id"],
            action="auto_renewal_period_created",
            notes="New renewal period created from approved contract.",
            metadata={"triggered_by": triggered_by, "previous_contract_id": contract["id"]},
        )
    return row


def run_renewal_automation(triggered_by="system", summary_to_email=None):
    today = date.today()
    max_date = (today + timedelta(days=30)).isoformat()
    min_date = today.isoformat()

    results = {
        "checked": 0,
        "pending_admin_approval": 0,
        "auto_sent_to_client": 0,
        "skipped": 0,
        "emails_sent": 0,
        "triggered_by": triggered_by,
        "run_at": datetime.now(timezone.utc).isoformat(),
    }
    tenant_agg = defaultdict(_empty_tenant_aggregate)

    contracts = (
        supabase.table("contracts")
        .select(
            "id, company_id, tenant_company_id, sales_rep_id, status, end_date, previous_amount, new_amount, "
            "currency, contract_type, inflation_base_rule, max_increase_limit, "
            "inflation_data_source, inflation_source_name, inflation_source_institution, inflation_source_method, "
            "auto_renew_enabled, auto_renew_term_months, renewed_from_contract_id, "
            "companies!contracts_company_id_fkey(company_name, authorized_email), "
            "tenant_companies:companies!contracts_tenant_company_id_fkey(company_name, authorized_email)"
        )
        .gte("end_date", min_date)
        .lte("end_date", max_date)
        .execute()
    ).data or []

    for contract in contracts:
        results["checked"] += 1
        tid_k = _tenant_key(contract.get("tenant_company_id"))
        tenant_agg[tid_k]["checked"] += 1

        tenant_company_id = contract.get("tenant_company_id")
        settings = get_company_automation_settings(tenant_company_id)
        contract_id = contract["id"]

        if not settings.get("auto_renewal_enabled"):
            results["skipped"] += 1
            tenant_agg[tid_k]["skipped"] += 1
            continue

        status = contract.get("status")
        if status == "client_approved":
            created = _create_next_period_contract(contract, triggered_by)
            if created:
                results["renewed_created"] += 1
                tenant_agg[tid_k]["renewed_created"] += 1
            else:
                results["skipped"] += 1
                tenant_agg[tid_k]["skipped"] += 1
            continue

        if _contract_is_final(status):
            results["skipped"] += 1
            tenant_agg[tid_k]["skipped"] += 1
            continue

        if not contract.get("auto_renew_enabled"):
            results["skipped"] += 1
            tenant_agg[tid_k]["skipped"] += 1
            continue

        if settings["require_admin_approval_before_auto_renew"]:
            if status != "admin_review":
                supabase.table("contracts").update({"status": "admin_review"}).eq(
                    "id", contract_id
                ).execute()
                add_contract_approval_log(
                    contract_id=contract_id,
                    action="approval_requested",
                    notes="Contract queued by automated renewal check.",
                    metadata={"triggered_by": triggered_by},
                )
                results["pending_admin_approval"] += 1
                tenant_agg[tid_k]["pending_admin_approval"] += 1

            if settings["automation_email_enabled"]:
                to_email = get_company_admin_email(tenant_company_id)
                if to_email:
                    ok = send_admin_approval_request_email(
                        to_email=to_email,
                        contract_id=contract_id,
                        client_company=(contract.get("companies", {}) or {}).get(
                            "company_name", "Unknown"
                        ),
                        end_date=contract.get("end_date"),
                    )
                    if ok:
                        results["emails_sent"] += 1
                        tenant_agg[tid_k]["emails_sent"] += 1
            continue

        if status != "sent_to_client":
            update_payload = {
                "status": "sent_to_client",
                "sent_to_client_at": datetime.now(timezone.utc).isoformat(),
            }
            supabase.table("contracts").update(update_payload).eq("id", contract_id).execute()
            add_contract_approval_log(
                contract_id=contract_id,
                action="auto_sent_to_client",
                notes="Sent directly to client because admin approval is disabled.",
                metadata={"triggered_by": triggered_by},
            )
            results["auto_sent_to_client"] += 1
            tenant_agg[tid_k]["auto_sent_to_client"] += 1

        if settings["automation_email_enabled"]:
            company = contract.get("companies", {}) or {}
            client_email = company.get("authorized_email")
            if client_email:
                ok = send_client_review_email(
                    to_email=client_email,
                    company_name=company.get("company_name", "Client"),
                    tenant_name=(contract.get("tenant_companies", {}) or {}).get(
                        "company_name", "Your Partner"
                    ),
                    contract_id=contract_id,
                    new_amount=contract.get("new_amount"),
                    custom_subject="Automatic Renewal Ready For Review",
                    custom_body=(
                        "This renewal was automatically prepared by RateGuard. "
                        "Please review and approve or reject from the portal."
                    ),
                )
                if ok:
                    results["emails_sent"] += 1
                    tenant_agg[tid_k]["emails_sent"] += 1

    if summary_to_email:
        send_automation_summary_email(
            {**results, "tenant_scoped": False},
            summary_to_email,
        )
    else:
        for tid_k, agg in tenant_agg.items():
            if tid_k == "__none__":
                continue
            admin_email = get_company_admin_email(tid_k)
            if not admin_email:
                continue
            send_automation_summary_email(
                {
                    **agg,
                    "triggered_by": triggered_by,
                    "run_at": results["run_at"],
                    "tenant_scoped": True,
                },
                admin_email,
            )

    return results

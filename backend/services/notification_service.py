from datetime import date

from services.email_service import send_contract_notification
from services.supabase_client import supabase

ALERT_THRESHOLDS = [30, 15, 7]
FINAL_STATUSES = {"client_approved", "client_rejected", "cancelled", "approved", "rejected"}


def _insert_notification(payload):
    data = {k: v for k, v in payload.items() if v is not None}
    try:
        if data.get("event_key"):
            existing = (
                supabase.table("notifications")
                .select("id")
                .eq("event_key", data["event_key"])
                .limit(1)
                .execute()
                .data
                or []
            )
            if existing:
                return existing[0]
        result = supabase.table("notifications").insert(data).execute()
        return result.data[0] if result.data else None
    except Exception as e:
        print(f"[Notifications] Full insert failed, retrying legacy payload: {e}")
        legacy_keys = {"contract_id", "title", "message", "type"}
        legacy = {k: v for k, v in data.items() if k in legacy_keys}
        result = supabase.table("notifications").insert(legacy).execute()
        return result.data[0] if result.data else None


def create_notification(
    title,
    message,
    notification_type="info",
    contract_id=None,
    recipient_user_id=None,
    recipient_company_id=None,
    action_url=None,
    category="system",
    event_key=None,
    metadata=None,
):
    return _insert_notification(
        {
            "contract_id": contract_id,
            "recipient_user_id": recipient_user_id,
            "recipient_company_id": recipient_company_id,
            "title": title,
            "message": message,
            "type": notification_type,
            "action_url": action_url,
            "category": category,
            "event_key": event_key,
            "metadata": metadata or {},
        }
    )


def notify_company_users(company_id, title, message, roles=None, **kwargs):
    if not company_id:
        return 0
    query = supabase.table("users").select("id, role").eq("company_id", company_id)
    if roles:
        query = query.in_("role", list(roles))
    users = query.execute().data or []
    created = 0
    for user in users:
        event_key = kwargs.get("event_key")
        user_event_key = f"{event_key}:user:{user['id']}" if event_key else None
        create_notification(
            title=title,
            message=message,
            recipient_user_id=user["id"],
            recipient_company_id=company_id,
            event_key=user_event_key,
            **{k: v for k, v in kwargs.items() if k != "event_key"},
        )
        created += 1
    return created


def notify_user(user_id, title, message, company_id=None, **kwargs):
    if not user_id:
        return None
    return create_notification(
        title=title,
        message=message,
        recipient_user_id=user_id,
        recipient_company_id=company_id,
        **kwargs,
    )


def check_expiring_contracts():
    today = date.today()
    results = {"checked": 0, "notifications_created": 0, "emails_sent": 0}

    try:
        contracts = (
            supabase.table("contracts")
            .select(
                "id, end_date, company_id, tenant_company_id, status, "
                "companies!contracts_company_id_fkey(company_name, authorized_email)"
            )
            .execute()
        ).data or []
    except Exception as e:
        print(f"[Notifications] Error fetching contracts: {e}")
        return results

    for contract in contracts:
        if contract.get("status") in FINAL_STATUSES:
            continue

        end_date_str = contract.get("end_date")
        if not end_date_str:
            continue

        try:
            end_date = date.fromisoformat(end_date_str[:10])
        except (ValueError, TypeError):
            continue

        days_remaining = (end_date - today).days
        results["checked"] += 1

        for threshold in ALERT_THRESHOLDS:
            if days_remaining != threshold:
                continue

            company = contract.get("companies", {}) or {}
            company_name = company.get("company_name", "Unknown")
            company_email = company.get("authorized_email", "")
            tenant_company_id = contract.get("tenant_company_id")
            notification_type = "danger" if threshold <= 7 else "warning"
            event_key = f"contract-expiry:{contract['id']}:{threshold}"

            created = create_notification(
                contract_id=contract["id"],
                recipient_company_id=tenant_company_id,
                title=f"Contract expires in {threshold} days",
                message=f"{company_name} expires on {end_date_str}. Review the renewal workflow.",
                notification_type=notification_type,
                action_url=f"/renewal-review/{contract['id']}",
                category="contract_expiry",
                event_key=event_key,
                metadata={"threshold_days": threshold},
            )
            if created:
                results["notifications_created"] += 1

            if company_email:
                sent = send_contract_notification(company_email, company_name, threshold, contract["id"])
                if sent:
                    results["emails_sent"] += 1

    return results

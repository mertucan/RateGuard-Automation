from datetime import date
from services.supabase_client import supabase
from services.email_service import send_contract_notification

ALERT_THRESHOLDS = [30, 15, 7]


def check_expiring_contracts():
    today = date.today()
    results = {"checked": 0, "notifications_created": 0, "emails_sent": 0}

    try:
        contracts = (
            supabase.table("contracts")
            .select(
                "id, end_date, company_id, status, "
                "companies!contracts_company_id_fkey(company_name, authorized_email)"
            )
            .execute()
        ).data or []
    except Exception as e:
        print(f"[Notifications] Error fetching contracts: {e}")
        return results

    for contract in contracts:
        if contract.get("status") in ("approved", "rejected"):
            continue

        end_date_str = contract.get("end_date")
        if not end_date_str:
            continue

        try:
            end_date = date.fromisoformat(end_date_str)
        except (ValueError, TypeError):
            continue

        days_remaining = (end_date - today).days
        results["checked"] += 1

        for threshold in ALERT_THRESHOLDS:
            if days_remaining == threshold:
                company = contract.get("companies", {}) or {}
                company_name = company.get("company_name", "Unknown")
                company_email = company.get("authorized_email", "")

                try:
                    existing = (
                        supabase.table("notifications")
                        .select("id")
                        .eq("contract_id", contract["id"])
                        .ilike("title", f"%{threshold} day%")
                        .execute()
                    ).data
                    if existing:
                        continue
                except Exception:
                    pass

                notification_type = "danger" if threshold <= 7 else "warning"
                notification = {
                    "contract_id": contract["id"],
                    "title": f"Contract Expiring in {threshold} Days",
                    "message": (
                        f"The contract for {company_name} will expire on "
                        f"{end_date_str}. Please review and take action."
                    ),
                    "type": notification_type,
                }
                try:
                    supabase.table("notifications").insert(notification).execute()
                    results["notifications_created"] += 1
                except Exception as e:
                    print(f"[Notifications] Error creating notification: {e}")

                if company_email:
                    sent = send_contract_notification(
                        company_email, company_name, threshold, contract["id"]
                    )
                    if sent:
                        results["emails_sent"] += 1

    return results

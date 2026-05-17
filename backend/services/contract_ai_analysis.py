import json
import uuid
from datetime import datetime

from services.supabase_client import supabase


CLAUSE_DEFINITIONS = [
    ("commercial_terms", "Commercial Terms", "Core pricing, currency, and contract value."),
    ("renewal_adjustment", "Renewal Adjustment", "Inflation rule, applied increase, and renewal delta."),
    ("term", "Term", "Contract end date and renewal period."),
    ("increase_cap", "Increase Cap", "Maximum increase guardrail."),
    ("data_source", "Market Data Source", "Inflation source and calculation method."),
    ("approval_state", "Approval State", "Workflow state and approval timing."),
    ("client_decision", "Client Decision", "Client approval or rejection context."),
    ("automation", "Renewal Automation", "Auto-renewal setting and term."),
]


def build_contract_ai_analysis(contract_id, user=None, persist=False):
    current = _fetch_contract(contract_id)
    if not current:
        raise ValueError("Contract not found")

    previous = _fetch_previous_contract(current)
    current_snapshot = _build_snapshot(current)
    previous_snapshot = _build_snapshot(previous) if previous else []
    clause_diffs = _compare_clauses(previous_snapshot, current_snapshot)
    financial = _financial_delta(previous, current)
    risk = _risk_assessment(current, financial, clause_diffs)
    playbooks = _playbooks(current, financial, risk)

    payload = {
        "contract_id": contract_id,
        "previous_contract_id": previous.get("id") if previous else None,
        "generated_at": datetime.utcnow().isoformat(),
        "scenario": "contract_version_change_analysis",
        "source": "deterministic",
        "executive_summary": _fallback_summary(previous, current, financial, risk, clause_diffs),
        "financial_delta": financial,
        "risk": risk,
        "playbooks": playbooks,
        "clause_diffs": clause_diffs,
        "snapshots": {
            "previous": previous_snapshot,
            "current": current_snapshot,
        },
    }

    ai_result = _try_ai_enrichment(payload)
    if ai_result:
        payload.update(ai_result)
        payload["source"] = "gemini"

    if persist:
        _persist_analysis(payload, user)

    return payload


def get_cached_contract_ai_analysis(contract_id):
    try:
        result = (
            supabase.table("contract_ai_analyses")
            .select("*")
            .eq("contract_id", contract_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            row = result.data[0]
            return {
                "id": row.get("id"),
                "contract_id": row.get("contract_id"),
                "previous_contract_id": row.get("previous_contract_id"),
                "generated_at": row.get("created_at"),
                "scenario": row.get("scenario"),
                "source": row.get("source"),
                "executive_summary": row.get("executive_summary") or "",
                "financial_delta": row.get("financial_delta") or {},
                "risk": row.get("risk") or {},
                "playbooks": row.get("playbooks") or [],
                "clause_diffs": row.get("clause_diffs") or [],
                "snapshots": row.get("snapshots") or {},
            }
    except Exception as exc:
        print(f"[contract ai analysis] cache read skipped: {exc}")
    return None


def _fetch_contract(contract_id):
    result = (
        supabase.table("contracts")
        .select(
            "*, "
            "client_company:companies!contracts_company_id_fkey(id, company_name, authorized_email), "
            "tenant_company:companies!contracts_tenant_company_id_fkey(id, company_name)"
        )
        .eq("id", contract_id)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _fetch_previous_contract(current):
    parent_id = current.get("renewed_from_contract_id")
    if parent_id:
        return _fetch_contract(parent_id)
    return None


def _build_snapshot(contract):
    if not contract:
        return []

    previous_amount = _to_float(contract.get("previous_amount"))
    new_amount = _to_float(contract.get("new_amount"), previous_amount)
    diff = new_amount - previous_amount
    adjustment = _to_float(contract.get("applied_adjustment"))
    currency = contract.get("currency") or "TRY"
    source_name = contract.get("inflation_source_name") or "TCMB EVDS"
    source_method = contract.get("inflation_source_method") or "Official EVDS API"
    status = contract.get("status") or "draft"

    texts = {
        "commercial_terms": (
            f"Contract value is {new_amount:,.2f} {currency}. "
            f"Previous/base value is {previous_amount:,.2f} {currency}."
        ),
        "renewal_adjustment": (
            f"Renewal uses {contract.get('inflation_base_rule') or 'TUFE'} with "
            f"{adjustment:.2f}% applied adjustment and {diff:,.2f} {currency} delta."
        ),
        "term": (
            f"Contract end date is {contract.get('end_date') or 'not set'}."
        ),
        "increase_cap": (
            f"Maximum increase limit is "
            f"{contract.get('max_increase_limit') if contract.get('max_increase_limit') is not None else 'not set'}."
        ),
        "data_source": (
            f"Market data source is {source_name}; method: {source_method}."
        ),
        "approval_state": (
            f"Workflow status is {status}; approved at {contract.get('approved_at') or 'not approved yet'}."
        ),
        "client_decision": (
            f"Client rejection reason: {contract.get('client_rejection_reason') or 'none'}."
        ),
        "automation": (
            f"Auto-renewal is {'enabled' if contract.get('auto_renew_enabled') else 'disabled'} "
            f"for {contract.get('auto_renew_term_months') or 12} months."
        ),
    }

    return [
        {
            "key": key,
            "title": title,
            "description": description,
            "text": texts[key],
        }
        for key, title, description in CLAUSE_DEFINITIONS
    ]


def _compare_clauses(previous_snapshot, current_snapshot):
    previous_by_key = {item["key"]: item for item in previous_snapshot}
    current_by_key = {item["key"]: item for item in current_snapshot}
    keys = [key for key, _, _ in CLAUSE_DEFINITIONS]
    diffs = []

    for key in keys:
        prev = previous_by_key.get(key)
        curr = current_by_key.get(key)
        if prev and curr:
            change_type = "unchanged" if prev["text"] == curr["text"] else "changed"
        elif curr:
            change_type = "added"
        else:
            change_type = "removed"
        severity = _clause_severity(key, change_type, prev, curr)
        diffs.append(
            {
                "key": key,
                "title": (curr or prev or {}).get("title", key),
                "change_type": change_type,
                "severity": severity,
                "old_text": prev.get("text") if prev else "",
                "new_text": curr.get("text") if curr else "",
                "summary": _clause_summary(key, change_type),
            }
        )
    return diffs


def _financial_delta(previous, current):
    current_previous_amount = _to_float(current.get("previous_amount"))
    current_new_amount = _to_float(current.get("new_amount"), current_previous_amount)
    old_value = _to_float(previous.get("new_amount"), _to_float(previous.get("previous_amount"))) if previous else current_previous_amount
    delta = current_new_amount - old_value
    pct = (delta / old_value * 100) if old_value else 0
    return {
        "before_amount": round(old_value, 2),
        "after_amount": round(current_new_amount, 2),
        "difference": round(delta, 2),
        "difference_percent": round(pct, 2),
        "applied_adjustment": round(_to_float(current.get("applied_adjustment")), 2),
        "currency": current.get("currency") or "TRY",
        "rule": current.get("inflation_base_rule") or "TUFE",
    }


def _risk_assessment(current, financial, clause_diffs):
    points = 0
    factors = []

    pct = financial.get("difference_percent") or 0
    cap = _to_float(current.get("max_increase_limit"), None)
    status = current.get("status") or "draft"

    if pct >= 50:
        points += 35
        factors.append("Renewal increase is above 50%.")
    elif pct >= 25:
        points += 20
        factors.append("Renewal increase is materially above prior value.")

    if cap is not None and financial.get("applied_adjustment", 0) >= cap:
        points += 15
        factors.append("Applied adjustment is at or near the configured cap.")

    changed_count = len([d for d in clause_diffs if d["change_type"] != "unchanged"])
    if changed_count >= 5:
        points += 20
        factors.append("Many contract areas changed in the version comparison.")
    elif changed_count >= 2:
        points += 10
        factors.append("Multiple contract areas changed.")

    if status in ("client_rejected", "cancelled"):
        points += 20
        factors.append("Current workflow state reflects rejection or cancellation.")
    elif status in ("draft", "finance_revision_requested", "admin_revision_requested"):
        points += 10
        factors.append("Current workflow still needs internal review.")

    score = min(100, points)
    if score >= 65:
        level = "high"
    elif score >= 30:
        level = "medium"
    else:
        level = "low"

    return {
        "score": score,
        "level": level,
        "factors": factors or ["No material risk flags detected from structured data."],
    }


def _playbooks(current, financial, risk):
    playbooks = []
    if risk["level"] == "high":
        playbooks.append(
            {
                "name": "High-risk renewal review",
                "actions": [
                    "Require finance and company admin review before client communication.",
                    "Prepare a client-facing explanation for the increase.",
                    "Check cap, source, and approval trail before sending.",
                ],
            }
        )
    if financial.get("difference_percent", 0) >= 25:
        playbooks.append(
            {
                "name": "High increase communication",
                "actions": [
                    "Explain the market-data source clearly.",
                    "Show previous amount, proposed amount, and difference.",
                    "Offer a follow-up review path for the client.",
                ],
            }
        )
    if current.get("status") == "client_rejected":
        playbooks.append(
            {
                "name": "Client rejection revision",
                "actions": [
                    "Create a new version from this contract.",
                    "Address the rejection reason in revised terms.",
                    "Ask sales to send a concise follow-up note.",
                ],
            }
        )
    if not playbooks:
        playbooks.append(
            {
                "name": "Standard renewal approval",
                "actions": [
                    "Confirm calculation inputs.",
                    "Approve internally.",
                    "Send the renewal package to the client.",
                ],
            }
        )
    return playbooks


def _fallback_summary(previous, current, financial, risk, clause_diffs):
    changed = len([d for d in clause_diffs if d["change_type"] != "unchanged"])
    if not previous:
        base = "No previous linked version was found; analysis is based on the current contract snapshot."
    else:
        base = (
            f"This renewal changes {changed} tracked contract areas. "
            f"The commercial value moves from {financial['before_amount']:,.2f} "
            f"to {financial['after_amount']:,.2f} {financial['currency']}."
        )
    return f"{base} Structured risk is {risk['level']} with score {risk['score']}/100."


def _try_ai_enrichment(payload):
    try:
        from services.gemini_service import generate_contract_change_analysis

        return generate_contract_change_analysis(payload)
    except Exception as exc:
        print(f"[contract ai analysis] Gemini enrichment skipped: {exc}")
        return None


def _persist_analysis(payload, user=None):
    try:
        row = {
            "id": str(uuid.uuid4()),
            "contract_id": payload.get("contract_id"),
            "previous_contract_id": payload.get("previous_contract_id"),
            "scenario": payload.get("scenario"),
            "source": payload.get("source"),
            "executive_summary": payload.get("executive_summary"),
            "financial_delta": payload.get("financial_delta"),
            "risk": payload.get("risk"),
            "playbooks": payload.get("playbooks"),
            "clause_diffs": payload.get("clause_diffs"),
            "snapshots": payload.get("snapshots"),
            "created_by_user_id": user.get("id") if user else None,
        }
        supabase.table("contract_ai_analyses").insert(row).execute()
    except Exception as exc:
        print(f"[contract ai analysis] persist skipped: {exc}")


def _clause_summary(key, change_type):
    if change_type == "unchanged":
        return "No material structured change detected."
    labels = {
        "commercial_terms": "Commercial value changed.",
        "renewal_adjustment": "Renewal calculation terms changed.",
        "term": "Contract term or end date changed.",
        "increase_cap": "Increase cap changed.",
        "data_source": "Market data source changed.",
        "approval_state": "Workflow status changed.",
        "client_decision": "Client decision context changed.",
        "automation": "Auto-renewal settings changed.",
    }
    return labels.get(key, "Clause changed.")


def _clause_severity(key, change_type, previous, current):
    if change_type == "unchanged":
        return "low"
    if key in ("commercial_terms", "renewal_adjustment", "increase_cap", "client_decision"):
        return "high"
    if key in ("term", "data_source", "approval_state"):
        return "medium"
    return "low"


def _to_float(value, default=0):
    if value is None or value == "":
        return default
    try:
        return float(value)
    except (TypeError, ValueError):
        return default

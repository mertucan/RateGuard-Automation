from datetime import date


ACTION_LABELS = {
    "renew": "Renew",
    "review": "Review",
    "cancel": "Cancel",
    "none": "No action",
}


def _parse_date(value):
    if not value:
        return None
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def build_renewal_recommendation(contract, today=None):
    today = today or date.today()
    end_date = _parse_date((contract or {}).get("end_date"))
    status = (contract or {}).get("status") or "draft"
    auto_renew_enabled = bool((contract or {}).get("auto_renew_enabled"))

    if not end_date:
        return _with_defaults({
            "action": "review",
            "label": ACTION_LABELS["review"],
            "priority": "medium",
            "days_until_end": None,
            "reason": "End date is missing. Review the contract before renewal planning.",
            "eligible_for_new_version": False,
        })

    days_until_end = (end_date - today).days
    near_end = days_until_end <= 90
    expired = days_until_end < 0

    if status == "cancelled":
        return _with_defaults({
            "action": "cancel",
            "label": ACTION_LABELS["cancel"],
            "priority": "low",
            "days_until_end": days_until_end,
            "reason": "This contract is already cancelled.",
            "eligible_for_new_version": False,
        })

    if status == "client_rejected":
        return _with_defaults({
            "action": "review",
            "label": ACTION_LABELS["review"],
            "priority": "high" if near_end else "medium",
            "days_until_end": days_until_end,
            "reason": "The client rejected the renewal. Review terms and create a revised version.",
            "eligible_for_new_version": True,
        })

    if expired and status not in ("client_approved", "sent_to_client"):
        return _with_defaults({
            "action": "cancel",
            "label": ACTION_LABELS["cancel"],
            "priority": "high",
            "days_until_end": days_until_end,
            "reason": "The contract is past its end date with no active client approval flow. Cancel or close it if it will not continue.",
            "eligible_for_new_version": False,
        })

    if near_end and (status == "client_approved" or auto_renew_enabled):
        return _with_defaults({
            "action": "renew",
            "label": ACTION_LABELS["renew"],
            "priority": "high" if days_until_end <= 30 else "medium",
            "days_until_end": days_until_end,
            "reason": "The end date is approaching and the contract is eligible for a new renewal period.",
            "eligible_for_new_version": status == "client_approved",
        })

    if near_end:
        return _with_defaults({
            "action": "review",
            "label": ACTION_LABELS["review"],
            "priority": "high" if days_until_end <= 30 else "medium",
            "days_until_end": days_until_end,
            "reason": "The end date is approaching. Review pricing, approval status, and client communication.",
            "eligible_for_new_version": status in ("client_approved", "client_rejected", "cancelled"),
        })

    return _with_defaults({
        "action": "none",
        "label": ACTION_LABELS["none"],
        "priority": "low",
        "days_until_end": days_until_end,
        "reason": "No renewal action is needed yet.",
        "eligible_for_new_version": False,
    })


def _with_defaults(recommendation, source="rules"):
    return {
        "source": source,
        "confidence": 70 if source == "rules" else recommendation.get("confidence", 70),
        "next_steps": recommendation.get("next_steps") or [],
        "risk_flags": recommendation.get("risk_flags") or [],
        **recommendation,
    }


def _contract_ai_context(contract, rule_recommendation):
    return {
        "rule_recommendation": rule_recommendation,
        "contract": {
            "id": contract.get("id"),
            "status": contract.get("status"),
            "end_date": contract.get("end_date"),
            "previous_amount": contract.get("previous_amount"),
            "new_amount": contract.get("new_amount"),
            "currency": contract.get("currency"),
            "contract_type": contract.get("contract_type"),
            "inflation_base_rule": contract.get("inflation_base_rule"),
            "max_increase_limit": contract.get("max_increase_limit"),
            "applied_adjustment": contract.get("applied_adjustment"),
            "auto_renew_enabled": contract.get("auto_renew_enabled"),
            "auto_renew_term_months": contract.get("auto_renew_term_months"),
            "client_rejection_reason": contract.get("client_rejection_reason"),
        },
    }


def enrich_recommendation_with_ai(contract, rule_recommendation):
    try:
        from services.gemini_service import generate_renewal_recommendation

        ai = generate_renewal_recommendation(
            _contract_ai_context(contract, rule_recommendation)
        )
        action = ai.get("action") or rule_recommendation.get("action")
        return {
            **rule_recommendation,
            **ai,
            "action": action,
            "label": ai.get("label") or ACTION_LABELS.get(action, action.title()),
            "eligible_for_new_version": rule_recommendation.get("eligible_for_new_version", False),
            "days_until_end": rule_recommendation.get("days_until_end"),
            "source": "gemini",
        }
    except Exception as exc:
        print(f"[renewal recommendation] AI enrichment skipped: {exc}")
        return {
            **rule_recommendation,
            "source": "rules",
            "ai_error": str(exc),
        }


def attach_renewal_recommendation(contract, today=None, use_ai=False):
    if contract is None:
        return None
    enriched = dict(contract)
    recommendation = build_renewal_recommendation(
        enriched,
        today=today,
    )
    if use_ai and recommendation.get("action") != "none":
        recommendation = enrich_recommendation_with_ai(enriched, recommendation)
    enriched["renewal_recommendation"] = recommendation
    return enriched


def attach_renewal_recommendations(contracts, today=None, use_ai=False):
    return [
        attach_renewal_recommendation(c, today=today, use_ai=use_ai)
        for c in (contracts or [])
    ]

from datetime import date, datetime, timedelta
from flask import Blueprint, request, jsonify, g
from services.supabase_client import supabase
from services.auth_middleware import login_required
from services.market_cache import get_cached_market_data

companies_bp = Blueprint("companies", __name__)

# PostgREST/Supabase often caps a single response at ~1000 rows; paginate to load the full table.
_COUNTERPARTY_PAGE = 1000


def _fetch_all_companies_counterparty_rows(search: str):
    """Plain companies rows for contract dropdown; no joins. Ordered by id for stable pagination."""
    cols = "id, company_name, authorized_email, is_tenant"
    accumulated = []
    offset = 0
    while True:
        q = supabase.table("companies").select(cols)
        if search:
            q = q.ilike("company_name", f"%{search}%")
        q = q.order("id", desc=False).range(offset, offset + _COUNTERPARTY_PAGE - 1)
        res = q.execute()
        batch = list(res.data or [])
        accumulated.extend(batch)
        if len(batch) < _COUNTERPARTY_PAGE:
            break
        offset += _COUNTERPARTY_PAGE
    return accumulated


def _parent_linking_tenant_id(organization_id):
    """Tenant company id that linked this org as a client (our created_by_tenant_id)."""
    if not organization_id:
        return None
    try:
        res = (
            supabase.table("companies")
            .select("created_by_tenant_id")
            .eq("id", organization_id)
            .limit(1)
            .execute()
        )
    except Exception:
        return None
    if not res.data:
        return None
    return res.data[0].get("created_by_tenant_id")


def _merge_parent_tenant_into_client_map(companies_map, my_org_id):
    """
    Symmetric Clients list: if another company linked us (we are the client row),
    show that linking organization in our client map as well.
    """
    parent_id = _parent_linking_tenant_id(my_org_id)
    if not parent_id or str(parent_id) == str(my_org_id):
        return
    for v in companies_map.values():
        if str(v.get("id")) == str(parent_id):
            return
    pres = (
        supabase.table("companies")
        .select("*")
        .eq("id", parent_id)
        .limit(1)
        .execute()
    )
    if not pres.data:
        return
    p = pres.data[0]
    pk = p.get("id")
    if "contract_value" not in p:
        p["contract_value"] = 0
    companies_map[pk] = p


def _merge_parent_tenant_into_counterparty_map(companies_map, my_org_id):
    """Same as _merge_parent_tenant_into_client_map for slim counterparty rows (str keys)."""
    parent_id = _parent_linking_tenant_id(my_org_id)
    if not parent_id or str(parent_id) == str(my_org_id):
        return
    for v in companies_map.values():
        if str(v.get("id")) == str(parent_id):
            return
    pres = (
        supabase.table("companies")
        .select("id, company_name, authorized_email, is_tenant, created_at")
        .eq("id", parent_id)
        .limit(1)
        .execute()
    )
    if not pres.data:
        return
    p = pres.data[0]
    cid = str(p["id"])
    companies_map[cid] = {**p, "contract_value": 0}


@companies_bp.route("/api/companies", methods=["GET"])
@login_required
def list_companies():
    search = request.args.get("search", "").strip()
    include_all = request.args.get("include_all", "").lower() in ("1", "true", "yes")
    user = g.current_user

    try:
        # Tenant staff: optional full directory (all companies) for contract counterparty pickers.
        if user["role"] in ["company_admin", "finance", "sales"] and include_all:
            query = supabase.table("companies").select(
                "*, contracts!contracts_company_id_fkey(id, previous_amount, end_date)"
            )
            if search:
                query = query.ilike("company_name", f"%{search}%")
            result = query.order("created_at", desc=True).limit(5000).execute()
            companies = []
            my_id = user.get("company_id")
            for c in result.data or []:
                if my_id and c.get("id") == my_id:
                    continue
                contracts = c.pop("contracts", None) or []
                total_value = sum(
                    (ct.get("previous_amount", 0) or 0) for ct in contracts
                )
                c["contract_value"] = total_value
                companies.append(c)
            companies.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return jsonify(companies)

        # Company admin/finance/sales: only show companies we have actual CONTRACTS with
        if user["role"] in ["company_admin", "finance", "sales"]:
            contracts_res = supabase.table("contracts").select(
                "company_id, previous_amount, companies!contracts_company_id_fkey(*)"
            ).eq("tenant_company_id", user["company_id"]).execute()

            companies_map = {}
            for ct in contracts_res.data or []:
                comp = ct.get("companies")
                if not comp:
                    continue
                cid = comp["id"]
                if str(cid) == str(user["company_id"]):
                    continue
                if cid not in companies_map:
                    comp["contract_value"] = 0
                    companies_map[cid] = comp
                companies_map[cid]["contract_value"] = (
                    companies_map[cid].get("contract_value", 0) + (ct.get("previous_amount") or 0)
                )

            companies = list(companies_map.values())
            if search:
                search_lower = search.lower()
                companies = [c for c in companies if search_lower in c.get("company_name", "").lower()]
            companies.sort(key=lambda x: x.get("company_name", "").lower())
            return jsonify(companies)

        # Super admin behavior
        query = supabase.table("companies").select(
            "*, contracts!contracts_company_id_fkey(id, previous_amount, end_date)"
        )
        if search:
            query = query.ilike("company_name", f"%{search}%")

        result = query.order("created_at", desc=True).limit(5000).execute()

        companies = []
        for c in result.data or []:
            contracts = c.pop("contracts", None) or []
            total_value = sum(ct.get("previous_amount", 0) or 0 for ct in contracts)
            c["contract_value"] = total_value
            companies.append(c)

        return jsonify(companies)
    except Exception as e:
        print(f"[companies] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/contract-counterparties", methods=["GET"])
@login_required
def list_contract_counterparties():
    """
    Contract counterparty picker: tenant staff only see companies that are already
    their clients (created_by_tenant_id or existing contracts). Super admin sees the full directory.
    """
    search = request.args.get("search", "").strip()
    user = g.current_user
    role = user.get("role")

    if role == "user":
        return jsonify([])

    try:
        # All authenticated staff roles see every company except their own (for contract creation)
        tenant_id = user.get("company_id")
        rows = _fetch_all_companies_counterparty_rows(search)
        rows = [r for r in rows if not tenant_id or str(r.get("id")) != str(tenant_id)]
        for r in rows:
            r.setdefault("contract_value", 0)
        rows.sort(key=lambda x: (x.get("company_name") or "").lower())
        resp = jsonify(rows)
        resp.headers["X-Companies-Returned"] = str(len(rows))
        return resp
    except Exception as e:
        print(f"[companies] contract-counterparties error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/add-client-candidates", methods=["GET"])
@login_required
def list_add_client_candidates():
    """
    All companies except the tenant itself and companies already tied as clients
    (created_by_tenant_id or any contract with this tenant). Client-side combobox filters by name/email.
    """
    user = g.current_user
    role = user.get("role")
    tenant_q = request.args.get("tenant_company_id", "").strip()

    if role == "super_admin":
        tenant_id = tenant_q
        if not tenant_id:
            return jsonify({"error": "tenant_company_id is required."}), 400
    elif role in ("company_admin", "finance", "sales"):
        tenant_id = user.get("company_id")
        if not tenant_id:
            return jsonify({"error": "No tenant context."}), 400
    elif role == "user":
        return jsonify([])
    else:
        return jsonify({"error": "Insufficient permissions."}), 403

    try:
        exclude = {str(tenant_id)}

        linked = (
            supabase.table("companies")
            .select("id")
            .eq("created_by_tenant_id", tenant_id)
            .execute()
        )
        for r in linked.data or []:
            exclude.add(str(r["id"]))

        contracts = (
            supabase.table("contracts")
            .select("company_id")
            .eq("tenant_company_id", tenant_id)
            .execute()
        )
        for r in contracts.data or []:
            cid = r.get("company_id")
            if cid:
                exclude.add(str(cid))

        parent_id = _parent_linking_tenant_id(tenant_id)
        if parent_id:
            exclude.add(str(parent_id))

        all_rows = _fetch_all_companies_counterparty_rows("")
        candidates = [r for r in all_rows if str(r.get("id")) not in exclude]
        for r in candidates:
            r["contract_value"] = 0
        return jsonify(candidates)
    except Exception as e:
        print(f"[companies] add-client-candidates error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/available-to-link", methods=["GET"])
@login_required
def list_companies_available_to_link():
    """
    Non-tenant companies not yet assigned to any tenant (created_by_tenant_id IS NULL).
    Used to add clients from the shared directory instead of inventing new rows.
    """
    search = request.args.get("search", "").strip()
    try:
        query = (
            supabase.table("companies")
            .select("id, company_name, authorized_email, communication_language, created_at")
            .eq("is_tenant", False)
            .is_("created_by_tenant_id", "null")
        )
        if search:
            query = query.ilike("company_name", f"%{search}%")
        result = query.order("company_name").execute()
        return jsonify(result.data or [])
    except Exception as e:
        print(f"[companies] available-to-link error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/<company_id>/link-tenant", methods=["POST"])
@login_required
def link_company_to_tenant(company_id):
    user = g.current_user
    body = request.get_json() or {}

    if user["role"] == "super_admin":
        tenant_id = body.get("tenant_company_id")
        if not tenant_id:
            return jsonify({"error": "tenant_company_id is required for super admin."}), 400
        tcheck = (
            supabase.table("companies")
            .select("id, is_tenant")
            .eq("id", tenant_id)
            .limit(1)
            .execute()
        )
        if not tcheck.data or not tcheck.data[0].get("is_tenant"):
            return jsonify({"error": "tenant_company_id must be a tenant organization."}), 400
    else:
        if user["role"] not in ["company_admin", "finance", "sales"]:
            return jsonify({"error": "Insufficient permissions"}), 403
        tenant_id = user.get("company_id")
        if not tenant_id:
            return jsonify({"error": "No tenant context for this user."}), 400

    try:
        row = (
            supabase.table("companies")
            .select("id, is_tenant, created_by_tenant_id")
            .eq("id", company_id)
            .limit(1)
            .execute()
        )
        if not row.data:
            return jsonify({"error": "Company not found"}), 404
        comp = row.data[0]
        if str(comp["id"]) == str(tenant_id):
            return jsonify({"error": "Cannot link your own organization as a client."}), 400

        existing = comp.get("created_by_tenant_id")
        if existing and str(existing) != str(tenant_id):
            return jsonify({"error": "This company is already linked to another tenant."}), 409
        if existing and str(existing) == str(tenant_id):
            updated = (
                supabase.table("companies")
                .select("*")
                .eq("id", company_id)
                .limit(1)
                .execute()
            )
            return jsonify(updated.data[0] if updated.data else {})

        supabase.table("companies").update({"created_by_tenant_id": tenant_id}).eq("id", company_id).execute()
        updated = (
            supabase.table("companies")
            .select("*")
            .eq("id", company_id)
            .limit(1)
            .execute()
        )
        return jsonify(updated.data[0] if updated.data else {})
    except Exception as e:
        print(f"[companies] link-tenant error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/revenue-analysis", methods=["GET"])
@login_required
def revenue_analysis():
    """
    All-time / monthly / quarterly revenue-style snapshot for the Clients area:
    portfolio value, estimated renewal uplift from EVDS rules, activity in period.
    """
    user = g.current_user
    if user.get("role") not in ("super_admin", "company_admin"):
        return jsonify({"error": "Insufficient permissions"}), 403

    period = (request.args.get("period") or "month").lower()
    if period not in ("all", "month", "quarter"):
        period = "month"

    tenant_q = request.args.get("tenant_company_id", "").strip()
    today = date.today()
    selected_year = today.year
    selected_quarter = None
    try:
        selected_year = int(request.args.get("year") or today.year)
    except (TypeError, ValueError):
        selected_year = today.year

    if period == "all":
        period_start = None
        period_end = today
        period_label = "All time"
    elif period == "quarter":
        try:
            selected_quarter = int(request.args.get("quarter") or (((today.month - 1) // 3) + 1))
        except (TypeError, ValueError):
            selected_quarter = ((today.month - 1) // 3) + 1
        selected_quarter = min(max(selected_quarter, 1), 4)
        q0 = (selected_quarter - 1) * 3 + 1
        period_start = date(selected_year, q0, 1)
        if selected_quarter == 4:
            period_end = date(selected_year, 12, 31)
        else:
            period_end = date(selected_year, q0 + 3, 1) - timedelta(days=1)
        period_label = f"Q{selected_quarter} {selected_year}"
    else:
        period_start = date(today.year, today.month, 1)
        period_end = today
        period_label = today.strftime("%B %Y")

    try:
        query = supabase.table("contracts").select(
            "id, company_id, tenant_company_id, previous_amount, new_amount, applied_adjustment, "
            "status, created_at, end_date, inflation_base_rule, max_increase_limit, approved_at, "
            "companies!contracts_company_id_fkey(company_name)"
        )

        if user.get("role") == "company_admin":
            tid = user.get("company_id")
            if not tid:
                return jsonify({"error": "No tenant context."}), 400
            query = query.eq("tenant_company_id", tid)
        elif tenant_q:
            query = query.eq("tenant_company_id", tenant_q)

        rows = query.execute().data or []
    except Exception as e:
        print(f"[companies] revenue-analysis error: {e}")
        return jsonify({"error": str(e)}), 500

    market = get_cached_market_data()
    tufe = float(market.get("tufe") or 0)
    ufe = float(market.get("ufe") or 0)

    def nominal_adj_pct(rule: str) -> float:
        if rule == "UFE":
            return ufe
        if rule == "TUFE":
            return tufe
        if rule == "CUSTOM":
            return 0.0
        return (tufe + ufe) / 2 if (tufe or ufe) else 0.0

    def effective_new_amount(prev: float, rule: str, max_limit) -> float:
        if rule == "CUSTOM":
            try:
                adj = float(max_limit)
            except (TypeError, ValueError):
                adj = 0.0
            return (prev or 0) * (1 + adj / 100)

        adj = nominal_adj_pct(rule)
        if max_limit is not None and str(max_limit).strip() != "":
            try:
                adj = min(adj, float(max_limit))
            except (TypeError, ValueError):
                pass
        return (prev or 0) * (1 + adj / 100)

    def _date_from_value(value):
        if not value:
            return None
        try:
            s = str(value).replace("Z", "+00:00")
            if "T" in s or " " in s:
                return datetime.fromisoformat(s[:19]).date()
            return date.fromisoformat(s[:10])
        except (TypeError, ValueError):
            return None

    def _in_period(value, include_missing_for_all=False) -> bool:
        if period == "all":
            return include_missing_for_all or bool(value)
        d = _date_from_value(value)
        return bool(d and period_start <= d <= period_end)

    non_rejected_all = [
        r for r in rows if r.get("status") not in ("client_rejected", "cancelled")
    ]
    period_rows = [r for r in rows if _in_period(r.get("created_at"), include_missing_for_all=True)]
    non_rejected = [
        r for r in period_rows if r.get("status") not in ("client_rejected", "cancelled")
    ]
    active_like = [
        r
        for r in non_rejected
        if r.get("status", "draft") not in ("client_approved", "cancelled")
    ]

    def _money(value):
        try:
            return float(value) if value is not None and str(value).strip() != "" else 0.0
        except (TypeError, ValueError):
            return 0.0

    def _current_portfolio_value(row):
        if row.get("status") == "client_approved":
            approved_amount = _money(row.get("new_amount"))
            if approved_amount > 0:
                return approved_amount
        return _money(row.get("previous_amount"))

    total_portfolio_value = sum(_current_portfolio_value(r) for r in non_rejected)
    active_contracts = len(active_like)

    uplift_numerator = 0.0
    pct_sum = 0.0
    pct_n = 0
    for r in non_rejected:
        prev = float(r.get("previous_amount") or 0)
        if prev <= 0:
            continue
        na = r.get("new_amount")
        if na is not None and str(na).strip() != "":
            try:
                nv = float(na)
                pct = ((nv - prev) / prev) * 100
            except (TypeError, ValueError):
                nv = effective_new_amount(prev, r.get("inflation_base_rule") or "TUFE", r.get("max_increase_limit"))
                pct = ((nv - prev) / prev) * 100
        else:
            nv = effective_new_amount(prev, r.get("inflation_base_rule") or "TUFE", r.get("max_increase_limit"))
            pct = ((nv - prev) / prev) * 100
        uplift_numerator += max(0, nv - prev)
        pct_sum += pct
        pct_n += 1

    avg_increase_pct = round(pct_sum / pct_n, 2) if pct_n else 0.0
    portfolio_uplift_estimate = round(uplift_numerator, 2)

    new_in_period = len(period_rows)
    approved_in_period = sum(
        1
        for r in rows
        if r.get("status") == "client_approved" and _in_period(r.get("approved_at"), include_missing_for_all=True)
    )

    expiring_in_period = 0
    for r in non_rejected_all:
        if _in_period(r.get("end_date")):
            expiring_in_period += 1

    by_client = {}
    for r in non_rejected:
        cid = r.get("company_id")
        co = r.get("companies") or {}
        name = co.get("company_name") or "—"
        key = str(cid) if cid else name
        if key not in by_client:
            by_client[key] = {"company_id": cid, "company_name": name, "contract_count": 0, "value": 0.0}
        by_client[key]["contract_count"] += 1
        by_client[key]["value"] += _current_portfolio_value(r)

    top_clients = sorted(by_client.values(), key=lambda x: x["value"], reverse=True)[:8]

    return jsonify(
        {
            "period": period,
            "period_label": period_label,
            "period_start": period_start.isoformat() if period_start else None,
            "period_end": period_end.isoformat(),
            "year": selected_year if period == "quarter" else today.year,
            "quarter": selected_quarter,
            "generated_at": datetime.utcnow().isoformat() + "Z",
            "market": {"tufe": round(tufe, 2), "ufe": round(ufe, 2)},
            "portfolio": {
                "total_contracts": len(non_rejected),
                "active_pipeline_contracts": active_contracts,
                "total_value_try": round(total_portfolio_value, 2),
                "avg_estimated_increase_pct": avg_increase_pct,
                "estimated_renewal_uplift_try": portfolio_uplift_estimate,
            },
            "period_activity": {
                "new_contracts": new_in_period,
                "client_approved": approved_in_period,
                "expirations_in_range": expiring_in_period,
            },
            "top_clients_by_value": top_clients,
        }
    )


@companies_bp.route("/api/companies/<company_id>", methods=["GET"])
@login_required
def get_company(company_id):
    try:
        result = (
            supabase.table("companies")
            .select("*, contracts!contracts_company_id_fkey(id, previous_amount, end_date, inflation_base_rule, max_increase_limit)")
            .eq("id", company_id)
            .limit(1)
            .execute()
        )
        return jsonify(result.data[0] if result.data else None)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies", methods=["POST"])
@login_required
def create_company():
    body = request.get_json()
    user = g.current_user
    if user.get("role") not in ("super_admin", "company_admin"):
        return jsonify({"error": "Insufficient permissions"}), 403
    
    data = {
        "company_name": body["company_name"],
        "authorized_email": body["authorized_email"],
        "communication_language": body.get("communication_language", "professional"),
        "is_tenant": False,
    }

    # Automatically link the new client company to the creator's tenant
    if user.get("company_id"):
        data["created_by_tenant_id"] = user["company_id"]

    result = supabase.table("companies").insert(data).execute()
    return jsonify(result.data[0]), 201


@companies_bp.route("/api/companies/<company_id>", methods=["PUT"])
@login_required
def update_company(company_id):
    body = request.get_json()
    user = g.current_user
    if user.get("role") not in ("super_admin", "company_admin"):
        return jsonify({"error": "Insufficient permissions"}), 403
    allowed = ["company_name", "authorized_email", "communication_language"]
    data = {k: v for k, v in body.items() if k in allowed}
    if user.get("role") == "company_admin":
        visible = (
            supabase.table("companies")
            .select("id, created_by_tenant_id")
            .eq("id", company_id)
            .limit(1)
            .execute()
        )
        row = visible.data[0] if visible.data else None
        if not row or str(row.get("created_by_tenant_id")) != str(user.get("company_id")):
            return jsonify({"error": "Insufficient permissions"}), 403
    result = supabase.table("companies").update(data).eq("id", company_id).execute()
    return jsonify(result.data[0])


@companies_bp.route("/api/companies/<company_id>", methods=["DELETE"])
@login_required
def delete_company(company_id):
    user = g.current_user
    if user["role"] == "company_admin":
        # Only delete contracts between this client and the user's company
        supabase.table("contracts").delete().eq("company_id", company_id).eq("tenant_company_id", user["company_id"]).execute()

        remaining_contracts = supabase.table("contracts").select("id").eq("company_id", company_id).limit(1).execute()
        if not remaining_contracts.data:
            # Return directory company to the unlinked pool; do not erase shared catalog rows
            supabase.table("companies").update({"created_by_tenant_id": None}).eq("id", company_id).execute()

        return jsonify({"ok": True, "message": "Related contracts removed; client returned to directory when unused."})
        
    if user["role"] != "super_admin":
        return jsonify({"error": "Insufficient permissions"}), 403

    # Super admin deletes the whole company
    supabase.table("companies").delete().eq("id", company_id).execute()
    return jsonify({"ok": True})


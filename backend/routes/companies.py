from datetime import date, timedelta
from flask import Blueprint, request, jsonify, g
from services.supabase_client import supabase
from services.auth_middleware import login_required

companies_bp = Blueprint("companies", __name__)


@companies_bp.route("/api/companies", methods=["GET"])
@login_required
def list_companies():
    search = request.args.get("search", "").strip()
    user = g.current_user

    try:
        # If company admin, only show companies they have contracts with
        # For simplicity without schema changes, we fetch all contracts of this tenant
        # and extract the unique companies.
        if user["role"] in ["company_admin", "finance", "sales"]:
            # Fetch companies this tenant created
            created_res = supabase.table("companies").select("*").eq("created_by_tenant_id", user["company_id"]).execute()
            companies_map = {comp["id"]: comp for comp in created_res.data}
            
            # Fetch contracts to get related companies that might not be created by this tenant
            contracts_res = supabase.table("contracts").select("company_id, previous_amount, companies!contracts_company_id_fkey(*)").eq("tenant_company_id", user["company_id"]).execute()
            
            for ct in contracts_res.data:
                comp = ct.get("companies")
                if not comp: continue
                cid = comp["id"]
                if cid not in companies_map:
                    comp["contract_value"] = 0
                    companies_map[cid] = comp
                elif "contract_value" not in companies_map[cid]:
                    companies_map[cid]["contract_value"] = 0
                companies_map[cid]["contract_value"] += (ct.get("previous_amount") or 0)
            
            # Ensure contract_value is initialized for those without contracts
            for cid in companies_map:
                if "contract_value" not in companies_map[cid]:
                    companies_map[cid]["contract_value"] = 0
                    
            companies = list(companies_map.values())
            
            # Apply search filter
            if search:
                search_lower = search.lower()
                companies = [c for c in companies if search_lower in c.get("company_name", "").lower()]
                
            # Sort by created_at desc
            companies.sort(key=lambda x: x.get("created_at", ""), reverse=True)
            return jsonify(companies)

        # Super admin behavior
        query = supabase.table("companies").select(
            "*, contracts!contracts_company_id_fkey(id, previous_amount, end_date)"
        )
        if search:
            query = query.ilike("company_name", f"%{search}%")

        result = query.order("created_at", desc=True).execute()
        
        companies = []
        for c in result.data:
            contracts = c.pop("contracts", None) or []
            total_value = sum(ct.get("previous_amount", 0) or 0 for ct in contracts)
            c["contract_value"] = total_value
            companies.append(c)

        return jsonify(companies)
    except Exception as e:
        print(f"[companies] Supabase error: {e}")
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies/<company_id>", methods=["GET"])
@login_required
def get_company(company_id):
    try:
        result = (
            supabase.table("companies")
            .select("*, contracts!contracts_company_id_fkey(id, previous_amount, end_date, inflation_base_rule, max_increase_limit)")
            .eq("id", company_id)
            .single()
            .execute()
        )
        return jsonify(result.data)
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@companies_bp.route("/api/companies", methods=["POST"])
@login_required
def create_company():
    body = request.get_json()
    user = g.current_user
    
    data = {
        "company_name": body["company_name"],
        "authorized_email": body["authorized_email"],
        "communication_language": body.get("communication_language", "professional"),
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
    allowed = ["company_name", "authorized_email", "communication_language"]
    data = {k: v for k, v in body.items() if k in allowed}
    result = supabase.table("companies").update(data).eq("id", company_id).execute()
    return jsonify(result.data[0])


@companies_bp.route("/api/companies/<company_id>", methods=["DELETE"])
@login_required
def delete_company(company_id):
    user = g.current_user
    if user["role"] in ["company_admin", "finance", "sales"]:
        # Only delete contracts between this client and the user's company
        supabase.table("contracts").delete().eq("company_id", company_id).eq("tenant_company_id", user["company_id"]).execute()
        
        # If this company has no more contracts and is not a tenant itself, we can safely delete the company
        remaining_contracts = supabase.table("contracts").select("id").eq("company_id", company_id).limit(1).execute()
        if not remaining_contracts.data:
            supabase.table("companies").delete().eq("id", company_id).execute()
            
        return jsonify({"ok": True, "message": "Related contracts deleted."})
        
    # Super admin deletes the whole company
    supabase.table("companies").delete().eq("id", company_id).execute()
    return jsonify({"ok": True})


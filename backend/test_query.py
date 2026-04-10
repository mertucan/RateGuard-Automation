from services.supabase_client import supabase

try:
    select_clause = "*, contracts!inner(id, status)"
    query = supabase.table("notifications").select(select_clause)
    query = query.eq("contracts.tenant_company_id", "20000000-0000-0000-0000-000000000001")
    result = query.limit(1).execute()
    print("Success:", result.data)
except Exception as e:
    print("Error:", e)
create index if not exists idx_contracts_tenant_client_lineage
  on public.contracts(tenant_company_id, company_id, renewed_from_contract_id);

create index if not exists idx_contracts_approved_lineage
  on public.contracts(status, approved_at desc, renewed_from_contract_id);

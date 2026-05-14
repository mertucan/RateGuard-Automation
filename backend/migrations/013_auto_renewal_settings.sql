alter table public.company_settings
  add column if not exists auto_renewal_enabled boolean not null default false;

alter table public.contracts
  add column if not exists auto_renew_enabled boolean not null default false,
  add column if not exists auto_renew_term_months integer not null default 12,
  add column if not exists renewed_from_contract_id uuid null references public.contracts(id) on delete set null;

create index if not exists idx_contracts_renewed_from_contract_id
  on public.contracts(renewed_from_contract_id);

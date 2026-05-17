create table if not exists public.contract_ai_analyses (
  id uuid not null default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  previous_contract_id uuid null references public.contracts(id) on delete set null,
  scenario text not null default 'contract_version_change_analysis',
  source text not null default 'deterministic',
  executive_summary text null,
  financial_delta jsonb not null default '{}'::jsonb,
  risk jsonb not null default '{}'::jsonb,
  playbooks jsonb not null default '[]'::jsonb,
  clause_diffs jsonb not null default '[]'::jsonb,
  snapshots jsonb not null default '{}'::jsonb,
  created_by_user_id uuid null references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  constraint contract_ai_analyses_pkey primary key (id)
);

create index if not exists idx_contract_ai_analyses_contract_id
  on public.contract_ai_analyses(contract_id, created_at desc);

create index if not exists idx_contract_ai_analyses_previous_contract_id
  on public.contract_ai_analyses(previous_contract_id);

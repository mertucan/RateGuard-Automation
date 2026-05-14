create table if not exists public.company_settings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  auto_renewal_enabled boolean not null default false,
  require_admin_approval_before_auto_renew boolean not null default true,
  automation_email_enabled boolean not null default true,
  automation_notice_email text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.contract_approval_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete cascade,
  action text not null,
  actor_user_id uuid null references public.users(id) on delete set null,
  actor_name text null,
  notes text null,
  metadata jsonb null,
  created_at timestamp with time zone not null default now()
);

create index if not exists idx_contract_approval_logs_contract_id
  on public.contract_approval_logs(contract_id, created_at desc);

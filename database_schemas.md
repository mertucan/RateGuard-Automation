create table public.users (
  id uuid not null default gen_random_uuid (),
  company_id uuid null,
  full_name text not null,
  email text not null,
  role text not null,
  created_at timestamp with time zone null default now(),
  password_hash text null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE,
  constraint users_role_check check (
    (
      role = any (
        array[
          'super_admin'::text,
          'company_admin'::text,
          'finance'::text,
          'sales'::text,
          'hr'::text,
          'user'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create table public.renewals (
  id uuid not null default gen_random_uuid (),
  contract_id uuid not null,
  new_price numeric null,
  ai_text_draft text null,
  approval_status text null,
  created_at timestamp with time zone not null default now(),
  constraint renewals_pkey primary key (id),
  constraint renewals_contract_id_fkey foreign KEY (contract_id) references contracts (id)
) TABLESPACE pg_default;

create table public.notifications (
  id uuid not null default gen_random_uuid (),
  contract_id uuid null,
  title character varying(255) not null,
  message text not null,
  type character varying(50) null default 'warning'::character varying,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_contract_id_fkey foreign KEY (contract_id) references contracts (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.password_reset_codes (
  id uuid not null default gen_random_uuid (),
  email text not null,
  code character(6) not null,
  expires_at timestamp with time zone not null default (now() + '00:15:00'::interval),
  used boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint password_reset_codes_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_prc_email on public.password_reset_codes using btree (email) TABLESPACE pg_default;

create index IF not exists idx_prc_code on public.password_reset_codes using btree (code) TABLESPACE pg_default;

create table public.financial_logs (
  id uuid not null default gen_random_uuid (),
  record_date date not null,
  exchange_rate numeric null,
  tufe_data numeric null,
  ufe_data numeric null,
  created_at timestamp with time zone not null default now(),
  constraint financial_logs_pkey primary key (id)
) TABLESPACE pg_default;

create table public.contracts (
  id uuid not null,
  company_id uuid not null default gen_random_uuid (),
  previous_amount numeric not null,
  end_date date null,
  inflation_base_rule text null,
  max_increase_limit numeric null,
  created_at timestamp with time zone not null default now(),
  status text null default 'draft'::text,
  new_amount numeric null,
  applied_adjustment numeric null,
  rejection_notes text null,
  approved_at timestamp with time zone null,
  tenant_company_id uuid null,
  sales_rep_id uuid null,
  client_rejection_reason text null,
  sent_to_client_at timestamp with time zone null,
  currency character varying(3) null default 'TRY'::character varying,
  contract_type text null default 'service_contract'::text,
  auto_renew_enabled boolean not null default false,
  auto_renew_term_months integer not null default 12,
  renewed_from_contract_id uuid null,
  constraint contracts_pkey primary key (id),
  constraint contracts_company_id_fkey foreign KEY (company_id) references companies (id),
  constraint contracts_renewed_from_contract_id_fkey foreign KEY (renewed_from_contract_id) references contracts (id) on delete set null,
  constraint contracts_sales_rep_id_fkey foreign KEY (sales_rep_id) references users (id),
  constraint contracts_tenant_company_id_fkey foreign KEY (tenant_company_id) references companies (id)
) TABLESPACE pg_default;

create trigger trigger_contract_history
after INSERT
or
update on contracts for EACH row
execute FUNCTION log_contract_status_change ();

create table public.contract_history (
  id uuid not null default gen_random_uuid (),
  contract_id uuid not null,
  previous_amount numeric not null,
  new_amount numeric null,
  status text not null,
  changed_at timestamp with time zone not null default now(),
  changed_by_user_id uuid null,
  notes text null,
  constraint contract_history_pkey primary key (id),
  constraint contract_history_changed_by_user_id_fkey foreign KEY (changed_by_user_id) references users (id),
  constraint contract_history_contract_id_fkey foreign KEY (contract_id) references contracts (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_contract_history_contract_id on public.contract_history using btree (contract_id) TABLESPACE pg_default;

create table public.companies (
  id uuid not null default gen_random_uuid (),
  company_name text not null,
  authorized_email text not null,
  created_at timestamp with time zone null default now(),
  communication_language text null,
  is_tenant boolean null default false,
  created_by_tenant_id uuid null,
  constraint companies_pkey primary key (id),
  constraint companies_id_key unique (id),
  constraint companies_created_by_tenant_id_fkey foreign KEY (created_by_tenant_id) references companies (id)
) TABLESPACE pg_default;

create table public.communications (
  id uuid not null default gen_random_uuid (),
  contract_id uuid null,
  sender_user_id uuid null,
  message_text text not null,
  created_at timestamp with time zone null default now(),
  constraint communications_pkey primary key (id),
  constraint communications_contract_id_fkey foreign KEY (contract_id) references contracts (id) on delete CASCADE,
  constraint communications_sender_user_id_fkey foreign KEY (sender_user_id) references users (id) on delete set null
) TABLESPACE pg_default;

create table public.audit_logs (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  user_name text null,
  action text not null,
  entity_type text not null,
  entity_id text null,
  details jsonb null,
  created_at timestamp with time zone null default now(),
  constraint audit_logs_pkey primary key (id)
) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_user_id on public.audit_logs using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_entity_type on public.audit_logs using btree (entity_type) TABLESPACE pg_default;

create index IF not exists idx_audit_logs_created_at on public.audit_logs using btree (created_at desc) TABLESPACE pg_default;

create table public.company_settings (
  id uuid not null default gen_random_uuid (),
  company_id uuid not null,
  auto_renewal_enabled boolean not null default false,
  require_admin_approval_before_auto_renew boolean not null default true,
  automation_email_enabled boolean not null default true,
  automation_notice_email text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint company_settings_pkey primary key (id),
  constraint company_settings_company_id_key unique (company_id),
  constraint company_settings_company_id_fkey foreign KEY (company_id) references companies (id) on delete CASCADE
) TABLESPACE pg_default;

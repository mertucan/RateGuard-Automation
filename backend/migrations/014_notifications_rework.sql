alter table public.notifications
  add column if not exists recipient_user_id uuid null references public.users(id) on delete cascade,
  add column if not exists recipient_company_id uuid null references public.companies(id) on delete cascade,
  add column if not exists action_url text null,
  add column if not exists category text not null default 'system',
  add column if not exists event_key text null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_notifications_recipient_user_id
  on public.notifications(recipient_user_id);

create index if not exists idx_notifications_recipient_company_id
  on public.notifications(recipient_company_id);

create index if not exists idx_notifications_is_read_created_at
  on public.notifications(is_read, created_at desc);

create unique index if not exists idx_notifications_event_key_unique
  on public.notifications(event_key)
  where event_key is not null;

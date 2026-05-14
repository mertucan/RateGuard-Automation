-- Align roles and contract statuses with the operational workflow:
-- draft -> finance_approved -> admin_approved -> sent_to_client -> client_approved/client_rejected.

update public.users
set role = 'user'
where role = 'client';

alter table public.users
  drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (
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
  );

update public.contracts
set status = case status
  when 'active' then 'draft'
  when 'approved' then 'client_approved'
  when 'pending_client' then 'sent_to_client'
  when 'rejected' then 'cancelled'
  else status
end
where status in ('active', 'approved', 'pending_client', 'rejected');

alter table public.contracts
  alter column status set default 'draft';

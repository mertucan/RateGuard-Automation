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
        'user'::text,
        'client'::text
      ]
    )
  );

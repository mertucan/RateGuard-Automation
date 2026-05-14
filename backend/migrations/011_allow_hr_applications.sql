alter table public.applications
  drop constraint if exists applications_department_check;

alter table public.applications
  add constraint applications_department_check
  check (target_department in ('sales', 'finance', 'hr'));

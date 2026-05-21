-- Phase 12 — Editable role × module permissions
--
-- The MODULES constant in lib/constants/modules.ts ships with sensible
-- defaults (the matrix from ROLE_PERMISSIONS.md). This table stores
-- per-(role, module_slug) overrides. Resolution at runtime: read this
-- table; if a row exists, use is_visible; otherwise fall back to the
-- code default. That keeps new modules visible by default to their
-- intended roles even before an admin has touched the matrix.

create table if not exists public.role_module_access (
  role         text not null
               check (role in (
                 'founder_admin',
                 'general_manager',
                 'service_manager',
                 'kitchen_manager',
                 'marketing_manager',
                 'catering_manager',
                 'team_member'
               )),
  module_slug  text not null,
  is_visible   boolean not null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id) on delete set null,
  primary key (role, module_slug)
);

create trigger role_module_access_set_updated_at
before update on public.role_module_access
for each row execute function public.set_updated_at();

alter table public.role_module_access enable row level security;

-- Everyone can read so the sidebar can resolve their own access without
-- needing service-role. Write is admin-only.
drop policy if exists rma_select on public.role_module_access;
create policy rma_select on public.role_module_access
  for select to authenticated using (true);

drop policy if exists rma_write on public.role_module_access;
create policy rma_write on public.role_module_access
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

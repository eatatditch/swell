-- SWELL — Phase 1 foundation
-- locations, profiles, user_location_assignments, departments,
-- helpers, RLS, signup trigger, seed data.

create extension if not exists pgcrypto;

-- =============================================================================
-- Generic updated_at trigger
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- locations
-- =============================================================================
create table public.locations (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger locations_set_updated_at
before update on public.locations
for each row execute function public.set_updated_at();

-- =============================================================================
-- profiles (1:1 with auth.users)
-- =============================================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique,
  full_name   text,
  avatar_url  text,
  role        text not null default 'team_member'
              check (role in (
                'founder_admin',
                'general_manager',
                'service_manager',
                'kitchen_manager',
                'marketing_manager',
                'catering_manager',
                'team_member'
              )),
  is_active   boolean not null default true,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- =============================================================================
-- user_location_assignments
-- =============================================================================
create table public.user_location_assignments (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  location_id  uuid not null references public.locations(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (user_id, location_id)
);

create index user_location_assignments_user_idx
  on public.user_location_assignments (user_id);
create index user_location_assignments_location_idx
  on public.user_location_assignments (location_id);

-- =============================================================================
-- departments (seed-only in Phase 1)
-- =============================================================================
create table public.departments (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- Helpers
-- =============================================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role = 'founder_admin'
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- Expand user's location assignments, with 'company_wide' rolling up to all
-- active locations. Returns an array of location ids.
create or replace function public.current_user_location_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public
as $$
  with assigned as (
    select location_id
    from public.user_location_assignments
    where user_id = auth.uid()
  ),
  has_company_wide as (
    select exists (
      select 1
      from assigned a
      join public.locations l on l.id = a.location_id
      where l.slug = 'company_wide'
    ) as v
  )
  select case
    when (select v from has_company_wide)
      then (select coalesce(array_agg(id), '{}') from public.locations where is_active)
    else (select coalesce(array_agg(location_id), '{}') from assigned)
  end;
$$;

create or replace function public.has_location_access(loc uuid)
returns boolean
language sql
stable
as $$
  select public.is_admin() or loc = any(public.current_user_location_ids());
$$;

-- =============================================================================
-- Signup trigger: when an auth.users row is inserted, create a profile.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.locations enable row level security;
alter table public.profiles enable row level security;
alter table public.user_location_assignments enable row level security;
alter table public.departments enable row level security;

-- locations: read by any authenticated user; write only by admins.
create policy locations_select on public.locations
  for select to authenticated using (true);
create policy locations_insert on public.locations
  for insert to authenticated with check (public.is_admin());
create policy locations_update on public.locations
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy locations_delete on public.locations
  for delete to authenticated using (public.is_admin());

-- profiles: self read/update; admins read/update all.
create policy profiles_select_self on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());
-- inserts happen via the signup trigger (security definer), so no client insert policy.
create policy profiles_delete_admin on public.profiles
  for delete to authenticated using (public.is_admin());

-- user_location_assignments: self read; admin write.
create policy ula_select on public.user_location_assignments
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy ula_insert on public.user_location_assignments
  for insert to authenticated with check (public.is_admin());
create policy ula_update on public.user_location_assignments
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy ula_delete on public.user_location_assignments
  for delete to authenticated using (public.is_admin());

-- departments: read all authenticated; admin write.
create policy departments_select on public.departments
  for select to authenticated using (true);
create policy departments_write_admin on public.departments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Seed data
-- =============================================================================
insert into public.locations (slug, name, sort_order) values
  ('bay_shore',      'Bay Shore',      10),
  ('port_jefferson', 'Port Jefferson', 20),
  ('kings_park',     'Kings Park',     30),
  ('company_wide',   'Company-wide',   90)
on conflict (slug) do nothing;

insert into public.departments (slug, name) values
  ('foh',         'Front of House'),
  ('boh',         'Back of House'),
  ('management',  'Management'),
  ('marketing',   'Marketing'),
  ('catering',    'Catering'),
  ('admin',       'Admin')
on conflict (slug) do nothing;

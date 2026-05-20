-- Phase 12 — System settings + per-location hours

-- One singleton row. The CHECK constrains id = 1 so any upsert collapses
-- onto the same row.
create table if not exists public.system_settings (
  id                       int primary key default 1 check (id = 1),
  company_name             text,
  logo_url                 text,
  primary_color            text,                -- hex, eg #F97316
  default_email_from_name  text,                -- override for outbound mail
  default_email_signature  text,
  default_reply_to         text,
  default_deposit_cents    integer not null default 50000,
  updated_at               timestamptz not null default now()
);

create trigger system_settings_set_updated_at
before update on public.system_settings
for each row execute function public.set_updated_at();

insert into public.system_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists system_settings_select on public.system_settings;
create policy system_settings_select on public.system_settings
  for select to authenticated using (true);

drop policy if exists system_settings_update on public.system_settings;
create policy system_settings_update on public.system_settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Hours of operation per location, per day of week. Day 0 = Sunday.
create table if not exists public.location_hours (
  id           uuid primary key default gen_random_uuid(),
  location_id  uuid not null references public.locations(id) on delete cascade,
  day_of_week  int not null check (day_of_week between 0 and 6),
  open_time    time,
  close_time   time,
  is_closed    boolean not null default false,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (location_id, day_of_week)
);

create trigger location_hours_set_updated_at
before update on public.location_hours
for each row execute function public.set_updated_at();

create index location_hours_location_idx on public.location_hours (location_id);

alter table public.location_hours enable row level security;

drop policy if exists location_hours_select on public.location_hours;
create policy location_hours_select on public.location_hours
  for select to authenticated using (true);

drop policy if exists location_hours_write on public.location_hours;
create policy location_hours_write on public.location_hours
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

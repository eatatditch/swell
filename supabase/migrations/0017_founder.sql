-- SWELL — Phase 11 Founder View
-- founder_priorities, decision_logs, founder_cash_snapshots.
-- All three are company-wide and admin-only at the RLS level.

-- =============================================================================
-- founder_priorities
-- =============================================================================
create table public.founder_priorities (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  title         text not null check (length(trim(title)) > 0),
  description   text,
  owner_id      uuid references public.profiles(id) on delete set null,
  status        text not null default 'open'
                check (status in ('open','in_progress','blocked','done','archived')),
  priority      text not null default 'normal'
                check (priority in ('low','normal','high','urgent')),
  target_date   date,
  position      int not null default 0,
  completed_at  timestamptz
);

create index founder_priorities_status_idx
  on public.founder_priorities (status, position);
create index founder_priorities_owner_idx
  on public.founder_priorities (owner_id);
create index founder_priorities_open_idx
  on public.founder_priorities (position)
  where status not in ('done','archived');

create trigger founder_priorities_set_updated_at
before update on public.founder_priorities
for each row execute function public.set_updated_at();

create or replace function public.founder_priorities_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger founder_priorities_completed_at_trg
before update on public.founder_priorities
for each row execute function public.founder_priorities_set_completed_at();

-- =============================================================================
-- decision_logs
-- =============================================================================
create table public.decision_logs (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,
  decided_on        date not null default current_date,
  title             text not null check (length(trim(title)) > 0),
  context           text,
  decision          text not null check (length(trim(decision)) > 0),
  owner_id          uuid references public.profiles(id) on delete set null,
  follow_up         text,
  follow_up_due     date,
  follow_up_done_at timestamptz
);

create index decision_logs_decided_idx
  on public.decision_logs (decided_on desc);
create index decision_logs_followup_open_idx
  on public.decision_logs (follow_up_due)
  where follow_up_done_at is null and follow_up is not null;

create trigger decision_logs_set_updated_at
before update on public.decision_logs
for each row execute function public.set_updated_at();

-- =============================================================================
-- founder_cash_snapshots
-- One row per Monday-start week. Cash position is entered by hand;
-- no bank integration in V1.
-- =============================================================================
create table public.founder_cash_snapshots (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,
  snapshot_date       date not null unique,
  cash_on_hand_cents  bigint not null check (cash_on_hand_cents >= 0),
  payables_cents      bigint not null default 0 check (payables_cents >= 0),
  receivables_cents   bigint not null default 0 check (receivables_cents >= 0),
  weekly_burn_cents   bigint check (weekly_burn_cents is null or weekly_burn_cents >= 0),
  notes               text
);

create index founder_cash_snapshots_date_idx
  on public.founder_cash_snapshots (snapshot_date desc);

create trigger founder_cash_snapshots_set_updated_at
before update on public.founder_cash_snapshots
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS — Founder View is admin-only.
-- =============================================================================
alter table public.founder_priorities enable row level security;
alter table public.decision_logs enable row level security;
alter table public.founder_cash_snapshots enable row level security;

create policy founder_priorities_select on public.founder_priorities
  for select to authenticated using (public.is_admin());

create policy founder_priorities_insert on public.founder_priorities
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy founder_priorities_update on public.founder_priorities
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy founder_priorities_delete on public.founder_priorities
  for delete to authenticated using (public.is_admin());

create policy decision_logs_select on public.decision_logs
  for select to authenticated using (public.is_admin());

create policy decision_logs_insert on public.decision_logs
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy decision_logs_update on public.decision_logs
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy decision_logs_delete on public.decision_logs
  for delete to authenticated using (public.is_admin());

create policy founder_cash_snapshots_select on public.founder_cash_snapshots
  for select to authenticated using (public.is_admin());

create policy founder_cash_snapshots_insert on public.founder_cash_snapshots
  for insert to authenticated
  with check (public.is_admin() and created_by = auth.uid());

create policy founder_cash_snapshots_update on public.founder_cash_snapshots
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy founder_cash_snapshots_delete on public.founder_cash_snapshots
  for delete to authenticated using (public.is_admin());

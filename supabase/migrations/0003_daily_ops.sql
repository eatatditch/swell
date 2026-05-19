-- SWELL — Phase 3 daily ops
-- checklists + items + completions, manager_logs, shift_notes,
-- eighty_sixed_items, maintenance_issues, guest_incidents (stub),
-- comp_void_notes.

-- =============================================================================
-- checklists (templates)
-- =============================================================================
create table public.checklists (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  location_id  uuid references public.locations(id) on delete set null,
  name         text not null check (length(trim(name)) > 0),
  kind         text not null check (kind in ('opening','closing','pre_shift','cleaning')),
  description  text,
  is_active    boolean not null default true
);

create index checklists_location_idx on public.checklists (location_id);
create index checklists_kind_idx on public.checklists (kind) where is_active;

create trigger checklists_set_updated_at
before update on public.checklists
for each row execute function public.set_updated_at();

-- =============================================================================
-- checklist_items
-- =============================================================================
create table public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  checklist_id  uuid not null references public.checklists(id) on delete cascade,
  position      int not null default 0,
  label         text not null check (length(trim(label)) > 0),
  requires_note boolean not null default false
);

create index checklist_items_checklist_idx
  on public.checklist_items (checklist_id, position);

create trigger checklist_items_set_updated_at
before update on public.checklist_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- checklist_completions (one run on a date at a location)
-- =============================================================================
create table public.checklist_completions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  checklist_id  uuid not null references public.checklists(id) on delete cascade,
  location_id   uuid not null references public.locations(id) on delete cascade,
  run_date      date not null default current_date,
  status        text not null default 'in_progress'
                check (status in ('in_progress','completed')),
  completed_by  uuid references public.profiles(id) on delete set null,
  completed_at  timestamptz,
  notes         text,
  created_by    uuid references auth.users(id) on delete set null,
  unique (checklist_id, location_id, run_date)
);

create index checklist_completions_location_date_idx
  on public.checklist_completions (location_id, run_date desc);
create index checklist_completions_checklist_idx
  on public.checklist_completions (checklist_id);

create trigger checklist_completions_set_updated_at
before update on public.checklist_completions
for each row execute function public.set_updated_at();

-- =============================================================================
-- checklist_item_completions (per-item state inside a completion)
-- =============================================================================
create table public.checklist_item_completions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  completion_id   uuid not null references public.checklist_completions(id) on delete cascade,
  item_id         uuid not null references public.checklist_items(id) on delete cascade,
  checked         boolean not null default false,
  note            text,
  checked_by      uuid references public.profiles(id) on delete set null,
  checked_at      timestamptz,
  unique (completion_id, item_id)
);

create index checklist_item_completions_completion_idx
  on public.checklist_item_completions (completion_id);

create trigger checklist_item_completions_set_updated_at
before update on public.checklist_item_completions
for each row execute function public.set_updated_at();

-- =============================================================================
-- manager_logs (narrative shift log)
-- =============================================================================
create table public.manager_logs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  author_id    uuid references public.profiles(id) on delete set null,
  location_id  uuid not null references public.locations(id) on delete cascade,
  log_date     date not null default current_date,
  shift        text not null check (shift in ('am','pm','all')),
  body         text not null check (length(trim(body)) > 0)
);

create index manager_logs_location_date_idx
  on public.manager_logs (location_id, log_date desc);
create index manager_logs_author_idx
  on public.manager_logs (author_id);

create trigger manager_logs_set_updated_at
before update on public.manager_logs
for each row execute function public.set_updated_at();

-- =============================================================================
-- shift_notes (handoff)
-- =============================================================================
create table public.shift_notes (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  author_id    uuid references public.profiles(id) on delete set null,
  location_id  uuid not null references public.locations(id) on delete cascade,
  note_date    date not null default current_date,
  from_shift   text not null check (from_shift in ('am','pm')),
  to_shift     text not null check (to_shift in ('am','pm')),
  body         text not null check (length(trim(body)) > 0)
);

create index shift_notes_location_date_idx
  on public.shift_notes (location_id, note_date desc);

create trigger shift_notes_set_updated_at
before update on public.shift_notes
for each row execute function public.set_updated_at();

-- =============================================================================
-- eighty_sixed_items
-- =============================================================================
create table public.eighty_sixed_items (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  location_id  uuid not null references public.locations(id) on delete cascade,
  name         text not null check (length(trim(name)) > 0),
  reason       text,
  until_at     timestamptz,
  resolved_at  timestamptz
);

create index eighty_sixed_items_location_active_idx
  on public.eighty_sixed_items (location_id, created_at desc)
  where resolved_at is null;

create trigger eighty_sixed_items_set_updated_at
before update on public.eighty_sixed_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- maintenance_issues
-- =============================================================================
create table public.maintenance_issues (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  location_id   uuid not null references public.locations(id) on delete cascade,
  title         text not null check (length(trim(title)) > 0),
  description   text,
  status        text not null default 'open'
                check (status in ('open','in_progress','resolved')),
  priority      text not null default 'normal'
                check (priority in ('low','normal','high','urgent')),
  reported_by   uuid references public.profiles(id) on delete set null,
  assigned_to   uuid references public.profiles(id) on delete set null,
  resolved_at   timestamptz
);

create index maintenance_issues_location_status_idx
  on public.maintenance_issues (location_id, status);
create index maintenance_issues_open_idx
  on public.maintenance_issues (location_id, created_at desc)
  where status <> 'resolved';

create trigger maintenance_issues_set_updated_at
before update on public.maintenance_issues
for each row execute function public.set_updated_at();

-- =============================================================================
-- guest_incidents (stub for Phase 9; table + RLS only)
-- =============================================================================
create table public.guest_incidents (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  location_id   uuid not null references public.locations(id) on delete cascade,
  summary       text not null check (length(trim(summary)) > 0),
  guest_name    text,
  occurred_at   timestamptz not null default now(),
  severity      text not null default 'normal'
                check (severity in ('low','normal','high','critical')),
  status        text not null default 'open'
                check (status in ('open','closed')),
  reported_by   uuid references public.profiles(id) on delete set null
);

create index guest_incidents_location_idx
  on public.guest_incidents (location_id, occurred_at desc);

create trigger guest_incidents_set_updated_at
before update on public.guest_incidents
for each row execute function public.set_updated_at();

-- =============================================================================
-- comp_void_notes
-- =============================================================================
create table public.comp_void_notes (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null,
  location_id   uuid not null references public.locations(id) on delete cascade,
  kind          text not null check (kind in ('comp','void')),
  amount_cents  bigint not null check (amount_cents >= 0),
  reason        text not null check (length(trim(reason)) > 0),
  manager_id    uuid references public.profiles(id) on delete set null,
  ticket_ref    text,
  occurred_at   timestamptz not null default now()
);

create index comp_void_notes_location_occurred_idx
  on public.comp_void_notes (location_id, occurred_at desc);

create trigger comp_void_notes_set_updated_at
before update on public.comp_void_notes
for each row execute function public.set_updated_at();

-- =============================================================================
-- Helper: is_manager_role() — covers comp/void inserts.
-- =============================================================================
create or replace function public.is_manager_role()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role in (
      'founder_admin',
      'general_manager',
      'service_manager',
      'kitchen_manager'
    )
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.checklists enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checklist_completions enable row level security;
alter table public.checklist_item_completions enable row level security;
alter table public.manager_logs enable row level security;
alter table public.shift_notes enable row level security;
alter table public.eighty_sixed_items enable row level security;
alter table public.maintenance_issues enable row level security;
alter table public.guest_incidents enable row level security;
alter table public.comp_void_notes enable row level security;

-- checklists (templates): readable to anyone with location access (or all auth
-- when location_id is null/company-wide); writable by admins and GMs.
create policy checklists_select on public.checklists
  for select to authenticated using (
    public.is_admin()
    or location_id is null
    or public.has_location_access(location_id)
  );

create policy checklists_insert on public.checklists
  for insert to authenticated with check (
    created_by = auth.uid()
    and (
      public.is_admin()
      or public.current_user_role() = 'general_manager'
    )
    and (
      location_id is null
      or public.has_location_access(location_id)
    )
  );

create policy checklists_update on public.checklists
  for update to authenticated
  using (
    public.is_admin()
    or (
      public.current_user_role() = 'general_manager'
      and (location_id is null or public.has_location_access(location_id))
    )
  )
  with check (
    public.is_admin()
    or (
      public.current_user_role() = 'general_manager'
      and (location_id is null or public.has_location_access(location_id))
    )
  );

create policy checklists_delete on public.checklists
  for delete to authenticated using (public.is_admin());

-- checklist_items: piggyback on parent checklist access for reads; admins +
-- GMs write.
create policy checklist_items_select on public.checklist_items
  for select to authenticated using (
    exists (
      select 1 from public.checklists c
      where c.id = checklist_items.checklist_id
        and (
          public.is_admin()
          or c.location_id is null
          or public.has_location_access(c.location_id)
        )
    )
  );

create policy checklist_items_write on public.checklist_items
  for all to authenticated
  using (
    public.is_admin()
    or (
      public.current_user_role() = 'general_manager'
      and exists (
        select 1 from public.checklists c
        where c.id = checklist_items.checklist_id
          and (c.location_id is null or public.has_location_access(c.location_id))
      )
    )
  )
  with check (
    public.is_admin()
    or (
      public.current_user_role() = 'general_manager'
      and exists (
        select 1 from public.checklists c
        where c.id = checklist_items.checklist_id
          and (c.location_id is null or public.has_location_access(c.location_id))
      )
    )
  );

-- checklist_completions: anyone with location access; inserter must be self
-- with location access.
create policy checklist_completions_select on public.checklist_completions
  for select to authenticated using (
    public.is_admin()
    or public.has_location_access(location_id)
  );

create policy checklist_completions_insert on public.checklist_completions
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
  );

create policy checklist_completions_update on public.checklist_completions
  for update to authenticated
  using (
    public.is_admin()
    or (created_by = auth.uid() and public.has_location_access(location_id))
    or (completed_by = auth.uid() and public.has_location_access(location_id))
    or public.has_location_access(location_id)
  )
  with check (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy checklist_completions_delete on public.checklist_completions
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- checklist_item_completions: gated by parent completion's location access.
create policy checklist_item_completions_select on public.checklist_item_completions
  for select to authenticated using (
    exists (
      select 1 from public.checklist_completions c
      where c.id = checklist_item_completions.completion_id
        and (public.is_admin() or public.has_location_access(c.location_id))
    )
  );

create policy checklist_item_completions_write on public.checklist_item_completions
  for all to authenticated
  using (
    exists (
      select 1 from public.checklist_completions c
      where c.id = checklist_item_completions.completion_id
        and (public.is_admin() or public.has_location_access(c.location_id))
    )
  )
  with check (
    exists (
      select 1 from public.checklist_completions c
      where c.id = checklist_item_completions.completion_id
        and (public.is_admin() or public.has_location_access(c.location_id))
    )
  );

-- manager_logs: read for anyone with location access; insert self + location;
-- update / delete by author or admin.
create policy manager_logs_select on public.manager_logs
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy manager_logs_insert on public.manager_logs
  for insert to authenticated with check (
    created_by = auth.uid()
    and author_id = auth.uid()
    and public.has_location_access(location_id)
  );

create policy manager_logs_update on public.manager_logs
  for update to authenticated
  using (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or author_id = auth.uid());

create policy manager_logs_delete on public.manager_logs
  for delete to authenticated using (
    public.is_admin() or author_id = auth.uid()
  );

-- shift_notes
create policy shift_notes_select on public.shift_notes
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy shift_notes_insert on public.shift_notes
  for insert to authenticated with check (
    created_by = auth.uid()
    and author_id = auth.uid()
    and public.has_location_access(location_id)
  );

create policy shift_notes_update on public.shift_notes
  for update to authenticated
  using (public.is_admin() or author_id = auth.uid())
  with check (public.is_admin() or author_id = auth.uid());

create policy shift_notes_delete on public.shift_notes
  for delete to authenticated using (
    public.is_admin() or author_id = auth.uid()
  );

-- eighty_sixed_items
create policy eighty_sixed_select on public.eighty_sixed_items
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy eighty_sixed_insert on public.eighty_sixed_items
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
  );

create policy eighty_sixed_update on public.eighty_sixed_items
  for update to authenticated
  using (
    public.is_admin()
    or (public.has_location_access(location_id))
  )
  with check (
    public.is_admin()
    or public.has_location_access(location_id)
  );

create policy eighty_sixed_delete on public.eighty_sixed_items
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- maintenance_issues
create policy maintenance_issues_select on public.maintenance_issues
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy maintenance_issues_insert on public.maintenance_issues
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
  );

create policy maintenance_issues_update on public.maintenance_issues
  for update to authenticated
  using (
    public.is_admin()
    or public.has_location_access(location_id)
  )
  with check (
    public.is_admin()
    or public.has_location_access(location_id)
  );

create policy maintenance_issues_delete on public.maintenance_issues
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- guest_incidents (stub)
create policy guest_incidents_select on public.guest_incidents
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy guest_incidents_insert on public.guest_incidents
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
  );

create policy guest_incidents_update on public.guest_incidents
  for update to authenticated
  using (public.is_admin() or created_by = auth.uid())
  with check (public.is_admin() or created_by = auth.uid());

create policy guest_incidents_delete on public.guest_incidents
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- comp_void_notes: managers only on insert; read scoped by location.
create policy comp_void_notes_select on public.comp_void_notes
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy comp_void_notes_insert on public.comp_void_notes
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.is_manager_role()
    and public.has_location_access(location_id)
  );

create policy comp_void_notes_update on public.comp_void_notes
  for update to authenticated
  using (
    public.is_admin()
    or (public.is_manager_role() and created_by = auth.uid())
  )
  with check (
    public.is_admin()
    or (public.is_manager_role() and created_by = auth.uid())
  );

create policy comp_void_notes_delete on public.comp_void_notes
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- Seed sample checklist templates (company-wide opening + closing).
-- =============================================================================
do $$
declare
  opening_id uuid;
  closing_id uuid;
begin
  if not exists (select 1 from public.checklists where name = 'Opening — Standard') then
    insert into public.checklists (name, kind, description, location_id, is_active)
    values (
      'Opening — Standard',
      'opening',
      'Default morning open. Unlock, set up, brief the team.',
      null,
      true
    )
    returning id into opening_id;

    insert into public.checklist_items (checklist_id, position, label, requires_note) values
      (opening_id, 10, 'Unlock and disarm alarm', false),
      (opening_id, 20, 'Walk the floor — temps, lights, music', false),
      (opening_id, 30, 'Boot POS and confirm tickets are clearing', false),
      (opening_id, 40, 'Brief AM team on specials and 86 list', true),
      (opening_id, 50, 'Confirm reservations on the book', false),
      (opening_id, 60, 'Bathroom and entrance walk', false),
      (opening_id, 70, 'Stock check: napkins, menus, marketing pieces', true);
  end if;

  if not exists (select 1 from public.checklists where name = 'Closing — Standard') then
    insert into public.checklists (name, kind, description, location_id, is_active)
    values (
      'Closing — Standard',
      'closing',
      'Default close. Money, equipment, security.',
      null,
      true
    )
    returning id into closing_id;

    insert into public.checklist_items (checklist_id, position, label, requires_note) values
      (closing_id, 10, 'Final guest out + lobby locked', false),
      (closing_id, 20, 'Cash out drawers and run nightly report', true),
      (closing_id, 30, 'Walk-in temps logged', true),
      (closing_id, 40, 'Equipment off — fryers, grills, hood', false),
      (closing_id, 50, 'Floors swept and mopped', false),
      (closing_id, 60, 'Trash + recycling out', false),
      (closing_id, 70, 'Set alarm and confirm armed', false);
  end if;
end;
$$;

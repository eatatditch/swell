-- SWELL — Phase 7 catering & events
-- catering_leads, catering_followups, catering_events, event_menu_items,
-- event_payments, event_ugc_opportunities, event_review_requests.
--
-- created_by columns FK to public.profiles so embedded joins from page
-- queries resolve through PostgREST (the auth.users schema is not exposed).
-- owner_id / assigned_to / recorded_by also FK to profiles for the same
-- reason. The audit trail still names the actor — every action logs to
-- activity_log via the existing logActivity helper.

-- =============================================================================
-- catering_leads — pipeline rows
-- =============================================================================
create table public.catering_leads (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  location_id     uuid references public.locations(id) on delete set null,
  owner_id        uuid references public.profiles(id) on delete set null,
  status          text not null default 'new'
                  check (status in ('new','contacted','proposal_sent','booked','lost')),
  contact_name    text not null check (length(trim(contact_name)) > 0),
  contact_email   text,
  contact_phone   text,
  company         text,
  event_type      text,
  desired_date    date,
  party_size      int check (party_size is null or party_size >= 0),
  budget_low_cents  bigint check (budget_low_cents is null or budget_low_cents >= 0),
  budget_high_cents bigint check (budget_high_cents is null or budget_high_cents >= 0),
  source          text,
  notes           text,
  converted_event_id uuid,
  lost_reason     text,
  closed_at       timestamptz
);

create index catering_leads_status_idx on public.catering_leads (status);
create index catering_leads_owner_idx on public.catering_leads (owner_id);
create index catering_leads_location_idx on public.catering_leads (location_id);
create index catering_leads_desired_date_idx on public.catering_leads (desired_date);
create index catering_leads_created_idx on public.catering_leads (created_at desc);

create trigger catering_leads_set_updated_at
before update on public.catering_leads
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_followups — reminders tied to a lead
-- =============================================================================
create table public.catering_followups (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references public.profiles(id) on delete set null,
  lead_id       uuid not null references public.catering_leads(id) on delete cascade,
  assigned_to   uuid references public.profiles(id) on delete set null,
  kind          text not null default 'task'
                check (kind in ('call','email','task')),
  body          text not null check (length(trim(body)) > 0),
  due_at        timestamptz,
  done_at       timestamptz
);

create index catering_followups_lead_idx
  on public.catering_followups (lead_id, due_at);
create index catering_followups_assignee_open_idx
  on public.catering_followups (assigned_to, due_at)
  where done_at is null;

create trigger catering_followups_set_updated_at
before update on public.catering_followups
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_events — the BEO record
-- =============================================================================
create table public.catering_events (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id) on delete set null,
  owner_id            uuid references public.profiles(id) on delete set null,
  lead_id             uuid references public.catering_leads(id) on delete set null,
  location_id         uuid not null references public.locations(id) on delete cascade,
  status              text not null default 'booked'
                      check (status in ('booked','confirmed','executed','canceled')),
  service_type        text not null default 'buffet'
                      check (service_type in (
                        'drop_off','buffet','plated','family_style',
                        'cocktail','food_truck','other'
                      )),
  title               text not null check (length(trim(title)) > 0),
  event_date          date not null,
  start_time          time,
  end_time            time,
  guest_count         int check (guest_count is null or guest_count >= 0),
  headcount_confirmed_at timestamptz,
  venue               text,
  room                text,
  contact_name        text,
  contact_phone       text,
  contact_email       text,
  billing_name        text,
  billing_address     text,
  allergens_notes     text,
  special_requests    text,
  setup_notes         text,
  breakdown_notes     text,
  equipment_notes     text,
  staffing_notes      text,
  beverage_notes      text,
  internal_notes      text,
  total_quoted_cents  bigint not null default 0 check (total_quoted_cents >= 0),
  canceled_at         timestamptz,
  cancel_reason       text
);

create index catering_events_location_date_idx
  on public.catering_events (location_id, event_date);
create index catering_events_date_idx on public.catering_events (event_date);
create index catering_events_status_idx on public.catering_events (status);
create index catering_events_lead_idx on public.catering_events (lead_id);
create index catering_events_owner_idx on public.catering_events (owner_id);

create trigger catering_events_set_updated_at
before update on public.catering_events
for each row execute function public.set_updated_at();

alter table public.catering_leads
  add constraint catering_leads_converted_event_fkey
  foreign key (converted_event_id) references public.catering_events(id) on delete set null;

-- =============================================================================
-- event_menu_items — line items on an event
-- =============================================================================
create table public.event_menu_items (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id) on delete set null,
  event_id          uuid not null references public.catering_events(id) on delete cascade,
  position          int not null default 0,
  category          text not null default 'food'
                    check (category in ('food','beverage','rental','service','other')),
  name              text not null check (length(trim(name)) > 0),
  description       text,
  quantity          numeric(12,2) not null default 1 check (quantity >= 0),
  unit_price_cents  bigint not null default 0 check (unit_price_cents >= 0),
  total_cents       bigint generated always as (
                      (round(quantity * unit_price_cents))::bigint
                    ) stored
);

create index event_menu_items_event_idx
  on public.event_menu_items (event_id, position);

create trigger event_menu_items_set_updated_at
before update on public.event_menu_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- event_payments — deposits / balance / refunds / gratuity
-- =============================================================================
create table public.event_payments (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  event_id        uuid not null references public.catering_events(id) on delete cascade,
  recorded_by     uuid references public.profiles(id) on delete set null,
  kind            text not null default 'deposit'
                  check (kind in ('deposit','balance','refund','gratuity')),
  status          text not null default 'pending'
                  check (status in ('pending','received','refunded','waived')),
  method          text check (method is null or method in ('cash','check','card','ach','other')),
  amount_cents    bigint not null check (amount_cents >= 0),
  due_at          timestamptz,
  paid_at         timestamptz,
  reference       text,
  notes           text
);

create index event_payments_event_idx
  on public.event_payments (event_id, due_at);
create index event_payments_status_idx on public.event_payments (status);

create trigger event_payments_set_updated_at
before update on public.event_payments
for each row execute function public.set_updated_at();

-- =============================================================================
-- event_ugc_opportunities — content opportunities tied to an event
-- =============================================================================
create table public.event_ugc_opportunities (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references public.profiles(id) on delete set null,
  event_id          uuid not null references public.catering_events(id) on delete cascade,
  owner_id          uuid references public.profiles(id) on delete set null,
  contact_name      text,
  instagram_handle  text,
  content_type      text not null default 'photos'
                    check (content_type in ('photos','reel','tag','feature','other')),
  status            text not null default 'planned'
                    check (status in ('planned','captured','posted','declined')),
  planned_for       timestamptz,
  posted_link       text,
  notes             text
);

create index event_ugc_event_idx
  on public.event_ugc_opportunities (event_id, status);

create trigger event_ugc_set_updated_at
before update on public.event_ugc_opportunities
for each row execute function public.set_updated_at();

-- =============================================================================
-- event_review_requests — post-event review tracking
-- =============================================================================
create table public.event_review_requests (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id) on delete set null,
  event_id            uuid not null references public.catering_events(id) on delete cascade,
  platform            text not null
                      check (platform in ('google','yelp','tripadvisor','opentable','other')),
  request_sent_at     timestamptz,
  response_received_at timestamptz,
  rating              int check (rating is null or (rating between 1 and 5)),
  link                text,
  notes               text
);

create index event_review_requests_event_idx
  on public.event_review_requests (event_id);

create trigger event_review_requests_set_updated_at
before update on public.event_review_requests
for each row execute function public.set_updated_at();

-- =============================================================================
-- has_catering_write_access() — catering work spans locations; managers,
-- catering managers, and admins can record payments. Reads still gate by
-- has_location_access(); this helper exists only to grant elevated writes.
-- =============================================================================
create or replace function public.has_catering_write_access()
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
      'kitchen_manager',
      'catering_manager'
    )
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.catering_leads enable row level security;
alter table public.catering_followups enable row level security;
alter table public.catering_events enable row level security;
alter table public.event_menu_items enable row level security;
alter table public.event_payments enable row level security;
alter table public.event_ugc_opportunities enable row level security;
alter table public.event_review_requests enable row level security;

-- catering_leads — read by anyone with location access (or admin); insert by
-- any authenticated user with location access; update/delete by creator,
-- owner, or admin.
create policy catering_leads_select on public.catering_leads
  for select to authenticated using (
    public.is_admin()
    or location_id is null
    or public.has_location_access(location_id)
  );

create policy catering_leads_insert on public.catering_leads
  for insert to authenticated with check (
    created_by = auth.uid()
    and (
      location_id is null
      or public.has_location_access(location_id)
    )
  );

create policy catering_leads_update on public.catering_leads
  for update to authenticated
  using (
    public.is_admin()
    or owner_id = auth.uid()
    or created_by = auth.uid()
    or (location_id is not null and public.has_location_access(location_id))
  )
  with check (
    public.is_admin()
    or owner_id = auth.uid()
    or created_by = auth.uid()
    or (location_id is not null and public.has_location_access(location_id))
  );

create policy catering_leads_delete on public.catering_leads
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- catering_followups — gated by parent lead access
create policy catering_followups_select on public.catering_followups
  for select to authenticated using (
    exists (
      select 1 from public.catering_leads l
      where l.id = catering_followups.lead_id
        and (
          public.is_admin()
          or l.location_id is null
          or public.has_location_access(l.location_id)
        )
    )
  );

create policy catering_followups_insert on public.catering_followups
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.catering_leads l
      where l.id = catering_followups.lead_id
        and (
          public.is_admin()
          or l.location_id is null
          or public.has_location_access(l.location_id)
        )
    )
  );

create policy catering_followups_update on public.catering_followups
  for update to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.catering_leads l
      where l.id = catering_followups.lead_id
        and l.location_id is not null
        and public.has_location_access(l.location_id)
    )
  )
  with check (
    public.is_admin()
    or created_by = auth.uid()
    or assigned_to = auth.uid()
    or exists (
      select 1 from public.catering_leads l
      where l.id = catering_followups.lead_id
        and l.location_id is not null
        and public.has_location_access(l.location_id)
    )
  );

create policy catering_followups_delete on public.catering_followups
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- catering_events — read by anyone with location access; collaborative
-- writes by any user with location access (catering managers + service
-- managers + GMs all touch BEOs day-of).
create policy catering_events_select on public.catering_events
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy catering_events_insert on public.catering_events
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
  );

create policy catering_events_update on public.catering_events
  for update to authenticated
  using (
    public.is_admin() or public.has_location_access(location_id)
  )
  with check (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy catering_events_delete on public.catering_events
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- event_menu_items — gated by parent event access
create policy event_menu_items_select on public.event_menu_items
  for select to authenticated using (
    exists (
      select 1 from public.catering_events e
      where e.id = event_menu_items.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  );

create policy event_menu_items_write on public.event_menu_items
  for all to authenticated
  using (
    exists (
      select 1 from public.catering_events e
      where e.id = event_menu_items.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  )
  with check (
    exists (
      select 1 from public.catering_events e
      where e.id = event_menu_items.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  );

create policy event_menu_items_delete on public.event_menu_items
  for delete to authenticated using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.catering_events e
      where e.id = event_menu_items.event_id
        and public.has_location_access(e.location_id)
    )
  );

-- event_payments — reads gated by parent event access; inserts/updates
-- require an elevated role via has_catering_write_access(); deletes by
-- admin or creator.
create policy event_payments_select on public.event_payments
  for select to authenticated using (
    exists (
      select 1 from public.catering_events e
      where e.id = event_payments.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  );

create policy event_payments_insert on public.event_payments
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_catering_write_access()
    and exists (
      select 1 from public.catering_events e
      where e.id = event_payments.event_id
        and public.has_location_access(e.location_id)
    )
  );

create policy event_payments_update on public.event_payments
  for update to authenticated
  using (
    public.is_admin()
    or (public.has_catering_write_access() and exists (
      select 1 from public.catering_events e
      where e.id = event_payments.event_id
        and public.has_location_access(e.location_id)
    ))
  )
  with check (
    public.is_admin()
    or (public.has_catering_write_access() and exists (
      select 1 from public.catering_events e
      where e.id = event_payments.event_id
        and public.has_location_access(e.location_id)
    ))
  );

create policy event_payments_delete on public.event_payments
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- event_ugc_opportunities — gated by parent event access for everything
create policy event_ugc_select on public.event_ugc_opportunities
  for select to authenticated using (
    exists (
      select 1 from public.catering_events e
      where e.id = event_ugc_opportunities.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  );

create policy event_ugc_insert on public.event_ugc_opportunities
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.catering_events e
      where e.id = event_ugc_opportunities.event_id
        and public.has_location_access(e.location_id)
    )
  );

create policy event_ugc_update on public.event_ugc_opportunities
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.catering_events e
      where e.id = event_ugc_opportunities.event_id
        and public.has_location_access(e.location_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.catering_events e
      where e.id = event_ugc_opportunities.event_id
        and public.has_location_access(e.location_id)
    )
  );

create policy event_ugc_delete on public.event_ugc_opportunities
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- event_review_requests
create policy event_review_select on public.event_review_requests
  for select to authenticated using (
    exists (
      select 1 from public.catering_events e
      where e.id = event_review_requests.event_id
        and (public.is_admin() or public.has_location_access(e.location_id))
    )
  );

create policy event_review_insert on public.event_review_requests
  for insert to authenticated with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.catering_events e
      where e.id = event_review_requests.event_id
        and public.has_location_access(e.location_id)
    )
  );

create policy event_review_update on public.event_review_requests
  for update to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.catering_events e
      where e.id = event_review_requests.event_id
        and public.has_location_access(e.location_id)
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.catering_events e
      where e.id = event_review_requests.event_id
        and public.has_location_access(e.location_id)
    )
  );

create policy event_review_delete on public.event_review_requests
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

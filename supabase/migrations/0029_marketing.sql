-- SWELL — Phase 8 Marketing
-- One coherent home for campaigns, content calendar, creative briefs,
-- shot lists, ad requests, UGC creators/collaborations, and post-campaign
-- performance notes.
--
-- Status pipelines: campaigns and content items both move through their
-- own pipeline (planning/active/paused/completed/cancelled for campaigns,
-- drafting/in_review/approved/scheduled/posted/archived for content).
-- Shot lists, ad requests, and UGC collaborations have their own narrower
-- workflows.
--
-- RLS: read by anyone in the marketing-adjacent roles (founder_admin,
-- general_manager, marketing_manager, catering_manager). Write by
-- founder_admin, general_manager, marketing_manager.

create or replace function public.marketing_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role in ('founder_admin','general_manager','marketing_manager')
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

create or replace function public.marketing_can_read()
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
      'marketing_manager',
      'catering_manager'
    )
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- marketing_campaigns
-- =============================================================================
create table public.marketing_campaigns (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  name            text not null check (length(trim(name)) > 0),
  theme           text,
  goal            text,
  description     text,
  status          text not null default 'planning'
                  check (status in (
                    'planning','active','paused','completed','cancelled'
                  )),
  starts_on       date,
  ends_on         date,
  owner_id        uuid references public.profiles(id) on delete set null,
  location_id     uuid references public.locations(id) on delete set null,
  channels        text[] not null default '{}'::text[],
  budget_cents    integer
);

create index marketing_campaigns_status_idx on public.marketing_campaigns (status);
create index marketing_campaigns_dates_idx
  on public.marketing_campaigns (starts_on, ends_on);
create index marketing_campaigns_owner_idx on public.marketing_campaigns (owner_id);

create trigger marketing_campaigns_set_updated_at
before update on public.marketing_campaigns
for each row execute function public.set_updated_at();

-- =============================================================================
-- content_items — content calendar entries (social, blog, email, SMS).
-- =============================================================================
create table public.content_items (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  campaign_id     uuid references public.marketing_campaigns(id) on delete set null,
  title           text not null check (length(trim(title)) > 0),
  channel         text not null check (channel in (
                    'instagram','facebook','tiktok','blog','website','email','sms','print','other'
                  )),
  body            text,
  caption         text,
  hashtags        text[] not null default '{}'::text[],
  asset_url       text,
  status          text not null default 'drafting'
                  check (status in (
                    'drafting','in_review','approved','scheduled','posted','archived'
                  )),
  scheduled_for   timestamptz,
  posted_at       timestamptz,
  assignee_id     uuid references public.profiles(id) on delete set null,
  approved_by     uuid references public.profiles(id) on delete set null,
  approved_at     timestamptz,
  location_id     uuid references public.locations(id) on delete set null,
  notes           text
);

create index content_items_calendar_idx
  on public.content_items (scheduled_for, status);
create index content_items_campaign_idx on public.content_items (campaign_id);
create index content_items_assignee_idx on public.content_items (assignee_id);
create index content_items_status_idx on public.content_items (status);

create trigger content_items_set_updated_at
before update on public.content_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- creative_briefs — one per campaign typically; can also be standalone.
-- =============================================================================
create table public.creative_briefs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  campaign_id     uuid references public.marketing_campaigns(id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  audience        text,
  objectives      text,
  key_messages    text,
  mandatories     text,
  tone            text,
  deliverables    text,
  deadline_on     date,
  status          text not null default 'drafting'
                  check (status in (
                    'drafting','in_review','approved','in_production','delivered'
                  ))
);

create index creative_briefs_campaign_idx on public.creative_briefs (campaign_id);
create index creative_briefs_deadline_idx on public.creative_briefs (deadline_on);

create trigger creative_briefs_set_updated_at
before update on public.creative_briefs
for each row execute function public.set_updated_at();

-- =============================================================================
-- shot_lists — groups of shots for a shoot, often tied to a campaign.
-- =============================================================================
create table public.shot_lists (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  campaign_id     uuid references public.marketing_campaigns(id) on delete set null,
  name            text not null check (length(trim(name)) > 0),
  shoot_date      date,
  location_id     uuid references public.locations(id) on delete set null,
  photographer    text,
  status          text not null default 'planning'
                  check (status in ('planning','ready','shot','delivered')),
  notes           text
);

create index shot_lists_campaign_idx on public.shot_lists (campaign_id);
create index shot_lists_date_idx on public.shot_lists (shoot_date);

create trigger shot_lists_set_updated_at
before update on public.shot_lists
for each row execute function public.set_updated_at();

-- =============================================================================
-- shot_list_items — individual shots in a shot list.
-- =============================================================================
create table public.shot_list_items (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  shot_list_id    uuid not null references public.shot_lists(id) on delete cascade,
  position        int not null default 0,
  description     text not null check (length(trim(description)) > 0),
  hero            boolean not null default false,
  props           text,
  setup_notes     text,
  is_done         boolean not null default false,
  asset_url       text
);

create index shot_list_items_list_idx on public.shot_list_items (shot_list_id, position);

create trigger shot_list_items_set_updated_at
before update on public.shot_list_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- ad_requests — paid ad requests with budget + workflow.
-- =============================================================================
create table public.ad_requests (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  campaign_id     uuid references public.marketing_campaigns(id) on delete set null,
  title           text not null check (length(trim(title)) > 0),
  channel         text not null check (channel in (
                    'meta','google','tiktok','print','radio','out_of_home','other'
                  )),
  goal            text,
  audience        text,
  copy            text,
  budget_cents    integer,
  starts_on       date,
  ends_on         date,
  status          text not null default 'requested'
                  check (status in (
                    'requested','in_design','approved','live','completed','cancelled'
                  )),
  requester_id    uuid references public.profiles(id) on delete set null,
  assignee_id     uuid references public.profiles(id) on delete set null,
  asset_url       text,
  notes           text
);

create index ad_requests_campaign_idx on public.ad_requests (campaign_id);
create index ad_requests_status_idx on public.ad_requests (status);

create trigger ad_requests_set_updated_at
before update on public.ad_requests
for each row execute function public.set_updated_at();

-- =============================================================================
-- ugc_creators — partner database (influencers, regulars, etc.).
-- =============================================================================
create table public.ugc_creators (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  name            text not null check (length(trim(name)) > 0),
  handle          text,
  platforms       text[] not null default '{}'::text[],
  tier            text not null default 'community'
                  check (tier in ('community','nano','micro','mid','macro')),
  email           text,
  phone           text,
  city            text,
  notes           text,
  is_active       boolean not null default true
);

create index ugc_creators_active_idx on public.ugc_creators (is_active);
create index ugc_creators_tier_idx on public.ugc_creators (tier);
create index ugc_creators_handle_idx on public.ugc_creators (lower(handle));

create trigger ugc_creators_set_updated_at
before update on public.ugc_creators
for each row execute function public.set_updated_at();

-- =============================================================================
-- ugc_collaborations — a specific deliverable from a creator.
-- =============================================================================
create table public.ugc_collaborations (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  creator_id      uuid not null references public.ugc_creators(id) on delete cascade,
  campaign_id     uuid references public.marketing_campaigns(id) on delete set null,
  deliverable     text not null check (length(trim(deliverable)) > 0),
  brief           text,
  compensation    text,
  due_on          date,
  delivered_at    timestamptz,
  posted_url      text,
  status          text not null default 'pitched'
                  check (status in (
                    'pitched','agreed','in_progress','delivered','posted','paid','cancelled'
                  )),
  notes           text
);

create index ugc_collabs_creator_idx on public.ugc_collaborations (creator_id);
create index ugc_collabs_campaign_idx on public.ugc_collaborations (campaign_id);
create index ugc_collabs_status_idx on public.ugc_collaborations (status);

create trigger ugc_collaborations_set_updated_at
before update on public.ugc_collaborations
for each row execute function public.set_updated_at();

-- =============================================================================
-- campaign_performance_notes — post-campaign learnings.
-- =============================================================================
create table public.campaign_performance_notes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  campaign_id     uuid not null references public.marketing_campaigns(id) on delete cascade,
  metric          text,
  result          text,
  observation     text,
  next_time       text
);

create index campaign_performance_campaign_idx
  on public.campaign_performance_notes (campaign_id);

create trigger campaign_performance_notes_set_updated_at
before update on public.campaign_performance_notes
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.marketing_campaigns        enable row level security;
alter table public.content_items              enable row level security;
alter table public.creative_briefs            enable row level security;
alter table public.shot_lists                 enable row level security;
alter table public.shot_list_items            enable row level security;
alter table public.ad_requests                enable row level security;
alter table public.ugc_creators               enable row level security;
alter table public.ugc_collaborations         enable row level security;
alter table public.campaign_performance_notes enable row level security;

create policy marketing_campaigns_select on public.marketing_campaigns
  for select to authenticated using (public.marketing_can_read());
create policy marketing_campaigns_write on public.marketing_campaigns
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy content_items_select on public.content_items
  for select to authenticated using (public.marketing_can_read());
create policy content_items_write on public.content_items
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy creative_briefs_select on public.creative_briefs
  for select to authenticated using (public.marketing_can_read());
create policy creative_briefs_write on public.creative_briefs
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy shot_lists_select on public.shot_lists
  for select to authenticated using (public.marketing_can_read());
create policy shot_lists_write on public.shot_lists
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy shot_list_items_select on public.shot_list_items
  for select to authenticated using (public.marketing_can_read());
create policy shot_list_items_write on public.shot_list_items
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy ad_requests_select on public.ad_requests
  for select to authenticated using (public.marketing_can_read());
create policy ad_requests_write on public.ad_requests
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy ugc_creators_select on public.ugc_creators
  for select to authenticated using (public.marketing_can_read());
create policy ugc_creators_write on public.ugc_creators
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy ugc_collaborations_select on public.ugc_collaborations
  for select to authenticated using (public.marketing_can_read());
create policy ugc_collaborations_write on public.ugc_collaborations
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy campaign_performance_notes_select on public.campaign_performance_notes
  for select to authenticated using (public.marketing_can_read());
create policy campaign_performance_notes_write on public.campaign_performance_notes
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

-- SWELL — Real-send for email + SMS.
-- Adds a native marketing_subscribers table, a marketing_sends audit log,
-- and a few send-related columns on content_items (subject, preheader,
-- target_tags).
--
-- Provider model:
--   - email: Resend
--   - sms:   Twilio
-- Provider IDs live on marketing_sends.provider_message_id so we can map
-- webhook callbacks back to the originating row.

-- =============================================================================
-- marketing_subscribers
-- =============================================================================
create table public.marketing_subscribers (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users(id) on delete set null,

  email               text,
  phone               text,
  name                text,

  -- Free-form segment tags (e.g. {'surf_club','bay_shore','brunch'})
  tags                text[] not null default '{}'::text[],
  source              text,
  location_id         uuid references public.locations(id) on delete set null,

  -- Marketing consent — set on signup / import.
  opt_in_email        boolean not null default true,
  opt_in_sms          boolean not null default false,
  opt_out_email_at    timestamptz,
  opt_out_sms_at      timestamptz,

  -- Activity stamps for guardrails ("don't text again within 24h").
  last_emailed_at     timestamptz,
  last_smsed_at       timestamptz,

  notes               text,
  is_active           boolean not null default true,

  constraint marketing_subscribers_at_least_one_channel
    check (email is not null or phone is not null)
);

create unique index marketing_subscribers_email_unique
  on public.marketing_subscribers (lower(email))
  where email is not null;
create unique index marketing_subscribers_phone_unique
  on public.marketing_subscribers (phone)
  where phone is not null;
create index marketing_subscribers_tags_idx
  on public.marketing_subscribers using gin (tags);
create index marketing_subscribers_active_idx
  on public.marketing_subscribers (is_active);

create trigger marketing_subscribers_set_updated_at
before update on public.marketing_subscribers
for each row execute function public.set_updated_at();

-- =============================================================================
-- content_items extensions
-- =============================================================================
alter table public.content_items
  add column subject text,
  add column preheader text,
  add column target_tags text[] not null default '{}'::text[];

create index content_items_target_tags_idx
  on public.content_items using gin (target_tags);

-- =============================================================================
-- marketing_sends — one row per (subscriber, content_item) send attempt.
-- =============================================================================
create table public.marketing_sends (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  content_item_id     uuid not null references public.content_items(id) on delete cascade,
  subscriber_id       uuid references public.marketing_subscribers(id) on delete set null,

  channel             text not null check (channel in ('email','sms')),
  provider            text not null check (provider in ('resend','twilio','test')),
  provider_message_id text,

  -- Snapshot of where we sent — so we can audit even if the subscriber
  -- record is later edited or deleted.
  to_email            text,
  to_phone            text,

  status              text not null default 'queued'
                      check (status in (
                        'queued','sending','sent','delivered','bounced',
                        'opened','clicked','complained','failed','unsubscribed'
                      )),
  error_message       text,

  sent_at             timestamptz,
  delivered_at        timestamptz,
  opened_at           timestamptz,
  clicked_at          timestamptz,
  unsubscribed_at     timestamptz
);

create index marketing_sends_item_idx
  on public.marketing_sends (content_item_id, created_at desc);
create index marketing_sends_subscriber_idx
  on public.marketing_sends (subscriber_id, created_at desc);
create index marketing_sends_provider_id_idx
  on public.marketing_sends (provider_message_id);
create index marketing_sends_status_idx
  on public.marketing_sends (status);

create trigger marketing_sends_set_updated_at
before update on public.marketing_sends
for each row execute function public.set_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.marketing_subscribers enable row level security;
alter table public.marketing_sends       enable row level security;

create policy marketing_subscribers_select on public.marketing_subscribers
  for select to authenticated using (public.marketing_can_read());
create policy marketing_subscribers_write on public.marketing_subscribers
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

create policy marketing_sends_select on public.marketing_sends
  for select to authenticated using (public.marketing_can_read());
create policy marketing_sends_write on public.marketing_sends
  for all to authenticated
  using (public.marketing_can_write())
  with check (public.marketing_can_write());

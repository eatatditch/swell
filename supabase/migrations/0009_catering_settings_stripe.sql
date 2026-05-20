-- SWELL — Phase D: catering settings + Stripe Connect
--
-- Per-location catering settings (default tax/gratuity/deposit, quote and
-- invoice terms text, sender info) plus the Stripe Connect plumbing:
--   stripe_account_id is the connected account id (acct_xxx) that the
--   platform charges through; we drive Checkout, payment intents, and
--   refunds against this account via the Stripe-Account header.
--
-- catering_payment_links tracks each Checkout session generated for an
-- invoice so we can show its status, expiry, and customer URL.
--
-- stripe_oauth_states stores a CSRF-bound `state` token for the
-- Stripe Connect OAuth handshake (issued on connect-start, consumed by
-- the callback).

-- =============================================================================
-- catering_settings
-- =============================================================================
create table public.catering_settings (
  id                          uuid primary key default gen_random_uuid(),
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  created_by                  uuid references public.profiles(id) on delete set null,
  location_id                 uuid unique references public.locations(id) on delete cascade,
  default_tax_rate_bps        int  not null default 0 check (default_tax_rate_bps >= 0 and default_tax_rate_bps <= 100000),
  default_gratuity_rate_bps   int  not null default 0 check (default_gratuity_rate_bps >= 0 and default_gratuity_rate_bps <= 100000),
  default_deposit_percent_bps int  not null default 0 check (default_deposit_percent_bps >= 0 and default_deposit_percent_bps <= 100000),
  quote_terms                 text,
  invoice_terms               text,
  reply_to_email              text,
  sender_name                 text,
  stripe_account_id           text unique,
  stripe_account_status       text not null default 'not_connected'
                              check (stripe_account_status in ('not_connected','onboarding','active','restricted','disconnected')),
  stripe_charges_enabled      boolean not null default false,
  stripe_payouts_enabled      boolean not null default false,
  stripe_connected_at         timestamptz,
  stripe_disconnected_at      timestamptz
);

create index catering_settings_location_idx
  on public.catering_settings (location_id);
create index catering_settings_stripe_account_idx
  on public.catering_settings (stripe_account_id)
  where stripe_account_id is not null;

create trigger catering_settings_set_updated_at
before update on public.catering_settings
for each row execute function public.set_updated_at();

alter table public.catering_settings enable row level security;

create policy catering_settings_select on public.catering_settings
  for select to authenticated using (true);
create policy catering_settings_insert on public.catering_settings
  for insert to authenticated with check (
    public.is_admin() or public.has_catering_write_access()
  );
create policy catering_settings_update on public.catering_settings
  for update to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());
create policy catering_settings_delete on public.catering_settings
  for delete to authenticated using (public.is_admin());

-- =============================================================================
-- catering_payment_links
-- =============================================================================
create table public.catering_payment_links (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  invoice_id            uuid not null references public.catering_invoices(id) on delete cascade,
  stripe_session_id     text unique,
  stripe_payment_intent_id text,
  stripe_account_id     text,
  amount_cents          bigint not null check (amount_cents > 0),
  currency              text not null default 'usd',
  status                text not null default 'pending'
                        check (status in ('pending','completed','expired','canceled','failed')),
  url                   text not null,
  expires_at            timestamptz,
  completed_at          timestamptz,
  metadata              jsonb not null default '{}'::jsonb
);

create index catering_payment_links_invoice_idx
  on public.catering_payment_links (invoice_id, created_at desc);
create index catering_payment_links_status_idx
  on public.catering_payment_links (status);

create trigger catering_payment_links_set_updated_at
before update on public.catering_payment_links
for each row execute function public.set_updated_at();

alter table public.catering_payment_links enable row level security;

create policy catering_payment_links_select on public.catering_payment_links
  for select to authenticated using (
    exists (
      select 1 from public.catering_invoices i
      where i.id = catering_payment_links.invoice_id
        and (public.is_admin()
             or i.location_id is null
             or public.has_location_access(i.location_id))
    )
  );
create policy catering_payment_links_write on public.catering_payment_links
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- =============================================================================
-- stripe_oauth_states — short-lived CSRF token store
-- =============================================================================
create table public.stripe_oauth_states (
  state         text primary key,
  location_id   uuid references public.locations(id) on delete cascade,
  user_id       uuid references public.profiles(id) on delete cascade,
  expires_at    timestamptz not null,
  created_at    timestamptz not null default now()
);

create index stripe_oauth_states_expires_idx
  on public.stripe_oauth_states (expires_at);

alter table public.stripe_oauth_states enable row level security;

-- Only admins read/write; the webhook/server actions use service-role through
-- the supabase server client so RLS doesn't block them.
create policy stripe_oauth_states_admin_select on public.stripe_oauth_states
  for select to authenticated using (public.is_admin());
create policy stripe_oauth_states_admin_write on public.stripe_oauth_states
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- SWELL — Phase F: Gmail integration (per-user OAuth).
--
-- Each catering manager / GM connects their own Gmail. Inbound mail that
-- mentions a known catering_contacts email gets auto-linked to that contact
-- and any of their open leads/events, so the lead detail page can render a
-- real conversation thread.
--
-- Token storage: access + refresh tokens are encrypted at the application
-- layer (AES-256-GCM, key from env). The token columns hold base64 of
-- iv || ciphertext || authTag. Only the service-role client writes them;
-- RLS keeps even the ciphertext private to the owner.

create table public.gmail_accounts (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  google_user_id        text not null,
  email                 text not null,
  access_token_enc      text not null,
  refresh_token_enc     text not null,
  token_expires_at      timestamptz,
  scopes                text[] not null default '{}',
  history_id            text,
  last_synced_at        timestamptz,
  status                text not null default 'active'
                          check (status in ('active','expired','revoked','error')),
  last_error            text
);

create unique index gmail_accounts_user_email_idx
  on public.gmail_accounts (user_id, lower(email));
create index gmail_accounts_status_idx
  on public.gmail_accounts (status) where status = 'active';

create trigger gmail_accounts_set_updated_at
before update on public.gmail_accounts
for each row execute function public.set_updated_at();

alter table public.gmail_accounts enable row level security;

create policy gmail_accounts_select on public.gmail_accounts
  for select to authenticated using (
    public.is_admin() or user_id = auth.uid()
  );

create policy gmail_accounts_delete on public.gmail_accounts
  for delete to authenticated using (
    public.is_admin() or user_id = auth.uid()
  );

create table public.email_messages (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  account_id      uuid not null references public.gmail_accounts(id) on delete cascade,
  google_message_id text not null,
  thread_id       text not null,
  direction       text not null check (direction in ('inbound','outbound')),
  from_email      text,
  from_name       text,
  to_emails       text[] not null default '{}',
  cc_emails       text[] not null default '{}',
  bcc_emails      text[] not null default '{}',
  subject         text,
  snippet         text,
  body_text       text,
  body_html       text,
  labels          text[] not null default '{}',
  sent_at         timestamptz,
  contact_id      uuid references public.catering_contacts(id) on delete set null,
  lead_id         uuid references public.catering_leads(id) on delete set null,
  event_id        uuid references public.catering_events(id) on delete set null
);

create unique index email_messages_account_msg_idx
  on public.email_messages (account_id, google_message_id);
create index email_messages_thread_idx
  on public.email_messages (thread_id, sent_at);
create index email_messages_contact_idx
  on public.email_messages (contact_id, sent_at desc);
create index email_messages_lead_idx
  on public.email_messages (lead_id, sent_at desc);
create index email_messages_event_idx
  on public.email_messages (event_id, sent_at desc);

alter table public.email_messages enable row level security;

create policy email_messages_select on public.email_messages
  for select to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.gmail_accounts a
      where a.id = email_messages.account_id and a.user_id = auth.uid()
    )
    or (
      lead_id is not null
      and exists (
        select 1 from public.catering_leads l
        where l.id = email_messages.lead_id
          and (l.location_id is null or public.has_location_access(l.location_id))
      )
    )
    or (
      event_id is not null
      and exists (
        select 1 from public.catering_events e
        where e.id = email_messages.event_id
          and public.has_location_access(e.location_id)
      )
    )
  );

create policy email_messages_delete on public.email_messages
  for delete to authenticated using (
    public.is_admin()
    or exists (
      select 1 from public.gmail_accounts a
      where a.id = email_messages.account_id and a.user_id = auth.uid()
    )
  );

create table public.google_oauth_states (
  state         text primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  consumed_at   timestamptz
);

create index google_oauth_states_expires_idx
  on public.google_oauth_states (expires_at);

alter table public.google_oauth_states enable row level security;

create policy google_oauth_states_owner on public.google_oauth_states
  for select to authenticated using (
    public.is_admin() or user_id = auth.uid()
  );

create policy google_oauth_states_delete on public.google_oauth_states
  for delete to authenticated using (
    public.is_admin() or user_id = auth.uid()
  );

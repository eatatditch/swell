-- Track Gmail watch lifecycle. Each Gmail users.watch returns a historyId
-- + expiration ≤7 days out; we re-up the watch from the existing cron when
-- watch_expires_at is within 24h so the push subscription never goes dark.

alter table public.gmail_accounts
  add column watch_expires_at timestamptz,
  add column watch_history_id text;

create index gmail_accounts_watch_renew_idx
  on public.gmail_accounts (watch_expires_at)
  where status = 'active';

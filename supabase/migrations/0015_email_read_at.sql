-- Inbox read-state tracking. read_at is the moment the operator marks an
-- inbound message read (either by opening the thread in /catering/mail or
-- via the per-message mark-read action). Outbound is implicitly read at
-- send time. Unread inbound count drives the nav badge.

alter table public.email_messages
  add column read_at timestamptz;

update public.email_messages
set read_at = sent_at
where direction = 'outbound' and read_at is null;

create index email_messages_unread_idx
  on public.email_messages (account_id, sent_at desc)
  where read_at is null and direction = 'inbound';

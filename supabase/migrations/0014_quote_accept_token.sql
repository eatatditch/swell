-- Public quote acceptance flow.
-- accept_token is the unguessable slug that anchors /q/<token>. Once the
-- operator hits "Send quote", we mint one and email a link. The customer
-- follows it and can Accept (→ Stripe Checkout for the deposit) or
-- Decline. Default deposit is $500 going forward.

alter table public.catering_quotes
  add column accept_token text,
  add column deposit_paid_at timestamptz,
  add column deposit_payment_intent_id text,
  alter column deposit_required_cents set default 50000;

create unique index catering_quotes_accept_token_idx
  on public.catering_quotes (accept_token)
  where accept_token is not null;

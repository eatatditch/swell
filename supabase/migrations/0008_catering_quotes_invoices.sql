-- SWELL — Phase C: catering quotes, invoices, billing
--
-- A quote is a proposal sent to a customer. It can be accepted to become
-- an invoice. An invoice is what gets paid. Both have line items with
-- snapshotted prices so library price changes don't rewrite history.
--
-- Money model:
--   - line_items.total_cents is a generated column (qty * unit_price)
--   - tax_rate_bps and gratuity_rate_bps are rates in basis points
--     (825 = 8.25%) stored on the parent row
--   - discount_cents and deposit_required_cents are explicit cents
--   - subtotal_cents, tax_cents, gratuity_cents, total_cents are
--     recomputed by the server action whenever line items or rates
--     change. They're persisted (not generated) because they depend on
--     the sum across a related table.

-- =============================================================================
-- Number sequences
-- =============================================================================
create sequence public.catering_quote_number_seq increment 1 minvalue 1 start 1001;
create sequence public.catering_invoice_number_seq increment 1 minvalue 1 start 1001;

-- =============================================================================
-- catering_quotes
-- =============================================================================
create table public.catering_quotes (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  contact_id            uuid not null references public.catering_contacts(id) on delete restrict,
  lead_id               uuid references public.catering_leads(id) on delete set null,
  event_id              uuid references public.catering_events(id) on delete set null,
  location_id           uuid references public.locations(id) on delete set null,
  quote_number          text not null unique,
  status                text not null default 'draft'
                        check (status in ('draft','sent','accepted','declined','expired','converted')),
  title                 text not null check (length(trim(title)) > 0),
  event_date            date,
  guest_count           int check (guest_count is null or guest_count >= 0),
  service_type          text check (service_type is null or service_type in (
                          'drop_off','buffet','plated','family_style',
                          'cocktail','food_truck','other'
                        )),
  customer_notes        text,
  internal_notes        text,
  subtotal_cents        bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents        bigint not null default 0 check (discount_cents >= 0),
  tax_rate_bps          int not null default 0 check (tax_rate_bps >= 0 and tax_rate_bps <= 100000),
  tax_cents             bigint not null default 0 check (tax_cents >= 0),
  gratuity_rate_bps     int not null default 0 check (gratuity_rate_bps >= 0 and gratuity_rate_bps <= 100000),
  gratuity_cents        bigint not null default 0 check (gratuity_cents >= 0),
  total_cents           bigint not null default 0 check (total_cents >= 0),
  deposit_required_cents bigint not null default 0 check (deposit_required_cents >= 0),
  valid_until           date,
  sent_at               timestamptz,
  accepted_at           timestamptz,
  declined_at           timestamptz,
  decline_reason        text,
  converted_invoice_id  uuid
);

create index catering_quotes_status_idx   on public.catering_quotes (status);
create index catering_quotes_contact_idx  on public.catering_quotes (contact_id);
create index catering_quotes_lead_idx     on public.catering_quotes (lead_id);
create index catering_quotes_event_idx    on public.catering_quotes (event_id);
create index catering_quotes_location_idx on public.catering_quotes (location_id);
create index catering_quotes_created_idx  on public.catering_quotes (created_at desc);

create trigger catering_quotes_set_updated_at
before update on public.catering_quotes
for each row execute function public.set_updated_at();

create or replace function public.catering_quote_assign_number()
returns trigger
language plpgsql
as $$
begin
  if NEW.quote_number is null or length(trim(NEW.quote_number)) = 0 then
    NEW.quote_number := 'Q-' || lpad(
      nextval('public.catering_quote_number_seq')::text, 5, '0'
    );
  end if;
  return NEW;
end
$$;

create trigger catering_quotes_assign_number
before insert on public.catering_quotes
for each row execute function public.catering_quote_assign_number();

-- =============================================================================
-- catering_quote_line_items
-- =============================================================================
create table public.catering_quote_line_items (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  quote_id          uuid not null references public.catering_quotes(id) on delete cascade,
  menu_item_id      uuid references public.catering_menu_items(id) on delete set null,
  position          int not null default 0,
  name              text not null check (length(trim(name)) > 0),
  description       text,
  unit              text not null default 'each',
  quantity          numeric(12,2) not null default 1 check (quantity >= 0),
  unit_price_cents  bigint not null default 0 check (unit_price_cents >= 0),
  total_cents       bigint generated always as (
                      (round((quantity * unit_price_cents::numeric)))::bigint
                    ) stored
);

create index catering_quote_line_items_quote_idx
  on public.catering_quote_line_items (quote_id, position);

create trigger catering_quote_line_items_set_updated_at
before update on public.catering_quote_line_items
for each row execute function public.set_updated_at();

-- =============================================================================
-- catering_invoices
-- =============================================================================
create table public.catering_invoices (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references public.profiles(id) on delete set null,
  contact_id            uuid not null references public.catering_contacts(id) on delete restrict,
  quote_id              uuid references public.catering_quotes(id) on delete set null,
  event_id              uuid references public.catering_events(id) on delete set null,
  location_id           uuid references public.locations(id) on delete set null,
  invoice_number        text not null unique,
  status                text not null default 'draft'
                        check (status in ('draft','sent','partially_paid','paid','overdue','void')),
  title                 text not null check (length(trim(title)) > 0),
  issue_date            date not null default current_date,
  due_date              date,
  customer_notes        text,
  internal_notes        text,
  subtotal_cents        bigint not null default 0 check (subtotal_cents >= 0),
  discount_cents        bigint not null default 0 check (discount_cents >= 0),
  tax_rate_bps          int not null default 0 check (tax_rate_bps >= 0 and tax_rate_bps <= 100000),
  tax_cents             bigint not null default 0 check (tax_cents >= 0),
  gratuity_rate_bps     int not null default 0 check (gratuity_rate_bps >= 0 and gratuity_rate_bps <= 100000),
  gratuity_cents        bigint not null default 0 check (gratuity_cents >= 0),
  total_cents           bigint not null default 0 check (total_cents >= 0),
  amount_paid_cents     bigint not null default 0 check (amount_paid_cents >= 0),
  balance_cents         bigint generated always as (
                          greatest(0::bigint, total_cents - amount_paid_cents)
                        ) stored,
  sent_at               timestamptz,
  paid_at               timestamptz,
  voided_at             timestamptz,
  void_reason           text
);

create index catering_invoices_status_idx   on public.catering_invoices (status);
create index catering_invoices_contact_idx  on public.catering_invoices (contact_id);
create index catering_invoices_quote_idx    on public.catering_invoices (quote_id);
create index catering_invoices_event_idx    on public.catering_invoices (event_id);
create index catering_invoices_location_idx on public.catering_invoices (location_id);
create index catering_invoices_due_date_idx on public.catering_invoices (due_date)
  where status not in ('paid','void');
create index catering_invoices_created_idx  on public.catering_invoices (created_at desc);

create trigger catering_invoices_set_updated_at
before update on public.catering_invoices
for each row execute function public.set_updated_at();

create or replace function public.catering_invoice_assign_number()
returns trigger
language plpgsql
as $$
begin
  if NEW.invoice_number is null or length(trim(NEW.invoice_number)) = 0 then
    NEW.invoice_number := 'INV-' || lpad(
      nextval('public.catering_invoice_number_seq')::text, 5, '0'
    );
  end if;
  return NEW;
end
$$;

create trigger catering_invoices_assign_number
before insert on public.catering_invoices
for each row execute function public.catering_invoice_assign_number();

-- =============================================================================
-- catering_invoice_line_items
-- =============================================================================
create table public.catering_invoice_line_items (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  invoice_id        uuid not null references public.catering_invoices(id) on delete cascade,
  menu_item_id      uuid references public.catering_menu_items(id) on delete set null,
  position          int not null default 0,
  name              text not null check (length(trim(name)) > 0),
  description       text,
  unit              text not null default 'each',
  quantity          numeric(12,2) not null default 1 check (quantity >= 0),
  unit_price_cents  bigint not null default 0 check (unit_price_cents >= 0),
  total_cents       bigint generated always as (
                      (round((quantity * unit_price_cents::numeric)))::bigint
                    ) stored
);

create index catering_invoice_line_items_invoice_idx
  on public.catering_invoice_line_items (invoice_id, position);

create trigger catering_invoice_line_items_set_updated_at
before update on public.catering_invoice_line_items
for each row execute function public.set_updated_at();

-- Backreference for quote → invoice conversion FK
alter table public.catering_quotes
  add constraint catering_quotes_converted_invoice_fkey
  foreign key (converted_invoice_id)
  references public.catering_invoices(id)
  on delete set null;

-- =============================================================================
-- event_payments.invoice_id — link payments to invoices
-- =============================================================================
alter table public.event_payments
  add column invoice_id uuid references public.catering_invoices(id) on delete set null;

create index event_payments_invoice_idx on public.event_payments (invoice_id)
  where invoice_id is not null;

-- =============================================================================
-- RLS — reads gated by location access (or admin); writes by catering write
-- access; deletes by admin or creator.
-- =============================================================================
alter table public.catering_quotes              enable row level security;
alter table public.catering_quote_line_items    enable row level security;
alter table public.catering_invoices            enable row level security;
alter table public.catering_invoice_line_items  enable row level security;

create policy catering_quotes_select on public.catering_quotes
  for select to authenticated using (
    public.is_admin()
    or location_id is null
    or public.has_location_access(location_id)
  );
create policy catering_quotes_insert on public.catering_quotes
  for insert to authenticated with check (
    created_by = auth.uid()
    and (public.is_admin() or public.has_catering_write_access())
  );
create policy catering_quotes_update on public.catering_quotes
  for update to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());
create policy catering_quotes_delete on public.catering_quotes
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

create policy catering_quote_line_items_select on public.catering_quote_line_items
  for select to authenticated using (
    exists (
      select 1 from public.catering_quotes q
      where q.id = catering_quote_line_items.quote_id
        and (public.is_admin()
             or q.location_id is null
             or public.has_location_access(q.location_id))
    )
  );
create policy catering_quote_line_items_write on public.catering_quote_line_items
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

create policy catering_invoices_select on public.catering_invoices
  for select to authenticated using (
    public.is_admin()
    or location_id is null
    or public.has_location_access(location_id)
  );
create policy catering_invoices_insert on public.catering_invoices
  for insert to authenticated with check (
    created_by = auth.uid()
    and (public.is_admin() or public.has_catering_write_access())
  );
create policy catering_invoices_update on public.catering_invoices
  for update to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());
create policy catering_invoices_delete on public.catering_invoices
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

create policy catering_invoice_line_items_select on public.catering_invoice_line_items
  for select to authenticated using (
    exists (
      select 1 from public.catering_invoices i
      where i.id = catering_invoice_line_items.invoice_id
        and (public.is_admin()
             or i.location_id is null
             or public.has_location_access(i.location_id))
    )
  );
create policy catering_invoice_line_items_write on public.catering_invoice_line_items
  for all to authenticated
  using (public.is_admin() or public.has_catering_write_access())
  with check (public.is_admin() or public.has_catering_write_access());

-- SWELL — Phase A: catering CRM + redesigned pipeline
--
-- Adds a proper catering_contacts directory and rebuilds the lead pipeline
-- around it. Stage names are renamed to match the operator-facing funnel:
--   new → lead, contacted → follow_up, proposal_sent → quote_sent.
-- Booked and lost stay the same.
--
-- Existing lead rows are migrated: their denormalized contact fields are
-- promoted into catering_contacts, deduped by email then name+phone, and
-- the lead's new contact_id FK points at them. The legacy columns are
-- then dropped.

-- =============================================================================
-- 1. catering_contacts
-- =============================================================================
create table public.catering_contacts (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  full_name       text not null check (length(trim(full_name)) > 0),
  email           text,
  phone           text,
  company         text,
  title           text,
  address         text,
  city            text,
  state           text,
  postal_code     text,
  source          text,
  tags            text[] not null default '{}',
  notes           text
);

create index catering_contacts_name_idx    on public.catering_contacts (lower(full_name));
create index catering_contacts_email_idx   on public.catering_contacts (lower(email));
create index catering_contacts_company_idx on public.catering_contacts (lower(company));
create index catering_contacts_created_idx on public.catering_contacts (created_at desc);

create trigger catering_contacts_set_updated_at
before update on public.catering_contacts
for each row execute function public.set_updated_at();

alter table public.catering_contacts enable row level security;

create policy catering_contacts_select on public.catering_contacts
  for select to authenticated using (true);

create policy catering_contacts_insert on public.catering_contacts
  for insert to authenticated with check (created_by = auth.uid());

create policy catering_contacts_update on public.catering_contacts
  for update to authenticated
  using (
    public.is_admin()
    or created_by = auth.uid()
    or public.has_catering_write_access()
  )
  with check (
    public.is_admin()
    or created_by = auth.uid()
    or public.has_catering_write_access()
  );

create policy catering_contacts_delete on public.catering_contacts
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

-- =============================================================================
-- 2. Rename lead pipeline stages
-- =============================================================================
update public.catering_leads set status = 'lead'        where status = 'new';
update public.catering_leads set status = 'follow_up'   where status = 'contacted';
update public.catering_leads set status = 'quote_sent'  where status = 'proposal_sent';

alter table public.catering_leads
  drop constraint catering_leads_status_check;

alter table public.catering_leads
  add constraint catering_leads_status_check
    check (status in ('lead','quote_sent','follow_up','booked','lost'));

alter table public.catering_leads
  alter column status set default 'lead';

-- =============================================================================
-- 3. New columns on catering_leads
-- =============================================================================
alter table public.catering_leads
  add column contact_id              uuid references public.catering_contacts(id) on delete set null,
  add column estimated_value_cents   bigint check (estimated_value_cents is null or estimated_value_cents >= 0),
  add column pipeline_position       int not null default 0;

-- =============================================================================
-- 4. Backfill contacts from existing leads
-- =============================================================================
do $$
declare
  r record;
  c_id uuid;
begin
  for r in
    select id, contact_name, contact_email, contact_phone, company,
           source, created_by, created_at
    from public.catering_leads
    where contact_id is null
  loop
    c_id := null;

    -- Dedupe by email first.
    if r.contact_email is not null and length(trim(r.contact_email)) > 0 then
      select id into c_id
      from public.catering_contacts
      where lower(email) = lower(r.contact_email)
      limit 1;
    end if;

    -- Fall back to name + phone match.
    if c_id is null then
      select id into c_id
      from public.catering_contacts
      where lower(full_name) = lower(r.contact_name)
        and coalesce(phone,'') = coalesce(r.contact_phone,'')
      limit 1;
    end if;

    -- Otherwise create a new contact row.
    if c_id is null then
      insert into public.catering_contacts (
        created_at, created_by, full_name, email, phone, company, source
      ) values (
        r.created_at, r.created_by,
        r.contact_name,
        nullif(trim(coalesce(r.contact_email,'')), ''),
        nullif(trim(coalesce(r.contact_phone,'')), ''),
        nullif(trim(coalesce(r.company,'')), ''),
        nullif(trim(coalesce(r.source,'')), '')
      )
      returning id into c_id;
    end if;

    update public.catering_leads
      set contact_id = c_id
      where id = r.id;
  end loop;
end $$;

alter table public.catering_leads
  alter column contact_id set not null;

alter table public.catering_leads
  drop column contact_name,
  drop column contact_email,
  drop column contact_phone,
  drop column company;

-- Initialize pipeline_position so existing rows sort cleanly within columns
-- (newest first → position 0 at top).
update public.catering_leads l
set pipeline_position = sub.rn
from (
  select id,
         row_number() over (partition by status order by created_at desc) - 1 as rn
  from public.catering_leads
) as sub
where l.id = sub.id;

create index catering_leads_status_position_idx
  on public.catering_leads (status, pipeline_position);

create index catering_leads_contact_idx
  on public.catering_leads (contact_id);

-- =============================================================================
-- 5. catering_events.contact_id — optional CRM link for booked events
-- =============================================================================
alter table public.catering_events
  add column contact_id uuid references public.catering_contacts(id) on delete set null;

update public.catering_events e
set contact_id = l.contact_id
from public.catering_leads l
where e.lead_id = l.id and e.contact_id is null;

create index catering_events_contact_idx
  on public.catering_events (contact_id);

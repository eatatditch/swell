-- SWELL — Phase E: catering inquiry forms
--
-- Adds a form-builder + public submission pipeline so the marketing site can
-- embed a guest-facing inquiry form whose submissions land directly in the
-- catering lead pipeline.
--
-- Two tables:
--   lead_forms             — form definition (schema, settings, embed slug)
--   lead_form_submissions  — raw payload + the lead it became
--
-- Forms are scoped to a location (the lead the submission creates is filed
-- against that location). Schema is JSONB — a tree of rows containing fields,
-- where each field has a type, label, key, validation, and an optional
-- lead-field/contact-field mapping that drives how the submission flows into
-- catering_leads / catering_contacts.

-- =============================================================================
-- lead_forms
-- =============================================================================
create table public.lead_forms (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references public.profiles(id) on delete set null,
  location_id     uuid not null references public.locations(id) on delete cascade,
  slug            text not null,
  name            text not null check (length(trim(name)) > 0),
  description     text,
  schema          jsonb not null default jsonb_build_object('rows', '[]'::jsonb),
  settings        jsonb not null default '{}'::jsonb,
  active          boolean not null default true,
  submission_count int not null default 0,
  last_submission_at timestamptz
);

create unique index lead_forms_slug_idx on public.lead_forms (lower(slug));
create index lead_forms_location_idx on public.lead_forms (location_id);
create index lead_forms_active_idx on public.lead_forms (active);

create trigger lead_forms_set_updated_at
before update on public.lead_forms
for each row execute function public.set_updated_at();

-- =============================================================================
-- lead_form_submissions
-- =============================================================================
create table public.lead_form_submissions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  form_id         uuid not null references public.lead_forms(id) on delete cascade,
  lead_id         uuid references public.catering_leads(id) on delete set null,
  contact_id      uuid references public.catering_contacts(id) on delete set null,
  payload         jsonb not null default '{}'::jsonb,
  source_url      text,
  ip              text,
  user_agent      text
);

create index lead_form_submissions_form_idx
  on public.lead_form_submissions (form_id, created_at desc);
create index lead_form_submissions_lead_idx
  on public.lead_form_submissions (lead_id);
create index lead_form_submissions_recent_ip_idx
  on public.lead_form_submissions (form_id, ip, created_at desc);

-- =============================================================================
-- RLS — admin + catering writers manage forms; submission inserts go through
-- the service-role client (the public POST endpoint), so no authenticated-user
-- insert policy is needed.
-- =============================================================================
alter table public.lead_forms enable row level security;
alter table public.lead_form_submissions enable row level security;

create policy lead_forms_select on public.lead_forms
  for select to authenticated using (
    public.is_admin() or public.has_location_access(location_id)
  );

create policy lead_forms_insert on public.lead_forms
  for insert to authenticated with check (
    created_by = auth.uid()
    and public.has_location_access(location_id)
    and (public.is_admin() or public.has_catering_write_access())
  );

create policy lead_forms_update on public.lead_forms
  for update to authenticated
  using (
    public.is_admin() or public.has_catering_write_access()
  )
  with check (
    public.is_admin() or public.has_catering_write_access()
  );

create policy lead_forms_delete on public.lead_forms
  for delete to authenticated using (
    public.is_admin() or created_by = auth.uid()
  );

create policy lead_form_submissions_select on public.lead_form_submissions
  for select to authenticated using (
    exists (
      select 1 from public.lead_forms f
      where f.id = lead_form_submissions.form_id
        and (public.is_admin() or public.has_location_access(f.location_id))
    )
  );

create policy lead_form_submissions_delete on public.lead_form_submissions
  for delete to authenticated using (
    public.is_admin()
  );

-- SWELL — Per-form source attribution.
--
-- Tag each lead_form with a marketing channel + a free-form label (e.g.
-- "Spring IG Campaign", "Patio QR table tent"). Inbound leads carry the
-- form's label into catering_leads.source and pick up source_form_id so
-- analytics can drill back to the exact form even if the label gets edited.

alter table public.lead_forms
  add column source_channel text not null default 'website'
    check (source_channel in (
      'instagram','website','qr_code','ad','email','referral','partner','other'
    )),
  add column source_label text;

create index lead_forms_channel_idx on public.lead_forms (source_channel);

alter table public.catering_leads
  add column source_form_id uuid references public.lead_forms(id) on delete set null;

create index catering_leads_source_form_idx on public.catering_leads (source_form_id);

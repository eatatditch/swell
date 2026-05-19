-- SWELL — structured manager logs + 86'd display fix
-- Repoints created_by FKs on tables whose pages embed the creator via
-- created_by from auth.users to public.profiles (PostgREST cannot chain
-- through auth.users). profiles is 1:1 with auth.users via the signup
-- trigger so existing rows remain valid.

alter table public.eighty_sixed_items
  drop constraint eighty_sixed_items_created_by_fkey;
alter table public.eighty_sixed_items
  add constraint eighty_sixed_items_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

alter table public.comments
  drop constraint comments_created_by_fkey;
alter table public.comments
  add constraint comments_created_by_fkey
  foreign key (created_by) references public.profiles(id) on delete set null;

-- Structured manager_logs columns plus a backlink to the checklist run
-- that filed them (opening / closing flows).
alter table public.manager_logs
  add column sales_cents bigint check (sales_cents is null or sales_cents >= 0),
  add column guest_count int check (guest_count is null or guest_count >= 0),
  add column comps_cents bigint check (comps_cents is null or comps_cents >= 0),
  add column voids_cents bigint check (voids_cents is null or voids_cents >= 0),
  add column notes text,
  add column checklist_completion_id uuid
    references public.checklist_completions(id) on delete set null;

update public.manager_logs set notes = body where notes is null;

alter table public.manager_logs alter column body drop not null;
alter table public.manager_logs drop constraint manager_logs_body_check;
alter table public.manager_logs
  add constraint manager_logs_has_content check (
    coalesce(length(trim(notes)), 0) > 0
    or coalesce(length(trim(body)), 0) > 0
    or sales_cents is not null
    or guest_count is not null
    or comps_cents is not null
    or voids_cents is not null
  );

create index manager_logs_checklist_completion_idx
  on public.manager_logs (checklist_completion_id)
  where checklist_completion_id is not null;

create unique index manager_logs_completion_unique
  on public.manager_logs (checklist_completion_id)
  where checklist_completion_id is not null;

-- SWELL — Surf School staff base.
-- Surf School gets its own user model: training_staff records (FOH / BOH /
-- Management) that sign in at /training/kiosk with a PIN. They aren't
-- auth.users. Existing training_progress / quiz_attempts / signoffs /
-- certifications / user_training_paths are switched from user_id (SWELL
-- profiles) to staff_id (kiosk staff). SWELL admins manage the roster
-- and content at /admin/training; to take training themselves, they get
-- their own training_staff record (linked_profile_id ties the two).

create extension if not exists pgcrypto;

-- =============================================================================
-- training_staff — Surf School's own user base.
-- =============================================================================
create table public.training_staff (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,

  full_name          text not null check (length(trim(full_name)) > 0),
  staff_type         text not null check (staff_type in ('foh','boh','management')),
  email              text,
  phone              text,
  location_id        uuid references public.locations(id) on delete set null,

  -- bcrypt hash of the kiosk PIN. Server-side verify with crypt().
  pin_hash           text not null,

  is_active          boolean not null default true,
  start_date         date,
  notes              text,

  -- Optional link to a SWELL profile, so a manager-who-also-trains has both
  -- identities tied together. Not used for auth — purely informational.
  linked_profile_id  uuid references public.profiles(id) on delete set null,

  last_seen_at       timestamptz
);

create index training_staff_active_idx
  on public.training_staff (is_active, staff_type);
create index training_staff_location_idx
  on public.training_staff (location_id);
create index training_staff_linked_profile_idx
  on public.training_staff (linked_profile_id);

create trigger training_staff_set_updated_at
before update on public.training_staff
for each row execute function public.set_updated_at();

-- =============================================================================
-- Course / path targeting by staff type.
-- Empty array = visible to everyone; non-empty = restricted to those types.
-- =============================================================================
alter table public.training_courses
  add column applies_to_staff_types text[] not null default '{}'::text[];

alter table public.training_paths
  add column target_staff_types text[] not null default '{}'::text[];

create index training_courses_staff_types_idx
  on public.training_courses using gin (applies_to_staff_types);
create index training_paths_staff_types_idx
  on public.training_paths using gin (target_staff_types);

-- =============================================================================
-- Switch progress / attempts / signoffs / paths / certs to staff_id.
-- =============================================================================

-- training_progress
alter table public.training_progress drop column user_id cascade;
alter table public.training_progress
  add column staff_id uuid not null references public.training_staff(id) on delete cascade;
alter table public.training_progress
  add constraint training_progress_staff_lesson_unique unique (staff_id, lesson_id);
create index training_progress_staff_idx
  on public.training_progress (staff_id, completed_at desc);

-- training_quiz_attempts
alter table public.training_quiz_attempts drop column user_id cascade;
alter table public.training_quiz_attempts
  add column staff_id uuid not null references public.training_staff(id) on delete cascade;
create index training_quiz_attempts_staff_idx
  on public.training_quiz_attempts (staff_id, quiz_id, completed_at desc);

-- training_signoffs (signed_by stays as profile id — managers sign off)
alter table public.training_signoffs drop column user_id cascade;
alter table public.training_signoffs
  add column staff_id uuid not null references public.training_staff(id) on delete cascade;
alter table public.training_signoffs
  add constraint training_signoffs_staff_course_unique unique (staff_id, course_id);
create index training_signoffs_staff_idx
  on public.training_signoffs (staff_id, signed_at desc);

-- certifications
alter table public.certifications drop column user_id cascade;
alter table public.certifications
  add column staff_id uuid not null references public.training_staff(id) on delete cascade;
create index certifications_staff_idx
  on public.certifications (staff_id, expires_on);

-- user_training_paths → staff_training_paths
alter table public.user_training_paths drop column user_id cascade;
alter table public.user_training_paths
  add column staff_id uuid not null references public.training_staff(id) on delete cascade;
alter table public.user_training_paths
  add constraint user_training_paths_staff_path_unique unique (staff_id, path_id);
alter table public.user_training_paths rename to staff_training_paths;
create index staff_training_paths_staff_idx
  on public.staff_training_paths (staff_id);

-- =============================================================================
-- RLS — rewrite policies that referenced auth.uid()/user_id.
-- Reads of content tables open to anon (kiosk staff aren't logged into
-- Supabase auth). Writes still gated by training_can_write().
-- Reads of progress/attempts/signoffs/certs limited to managers; staff
-- access these only through server actions that use the admin client.
-- =============================================================================

alter table public.training_staff enable row level security;

-- Drop policies whose definitions referenced user_id.
drop policy if exists training_quiz_attempts_select on public.training_quiz_attempts;
drop policy if exists training_quiz_attempts_insert on public.training_quiz_attempts;
drop policy if exists training_quiz_attempts_delete on public.training_quiz_attempts;

drop policy if exists user_training_paths_select on public.staff_training_paths;
drop policy if exists user_training_paths_write  on public.staff_training_paths;

drop policy if exists training_progress_select on public.training_progress;
drop policy if exists training_progress_insert on public.training_progress;
drop policy if exists training_progress_update on public.training_progress;
drop policy if exists training_progress_delete on public.training_progress;

drop policy if exists training_signoffs_select on public.training_signoffs;
drop policy if exists training_signoffs_insert on public.training_signoffs;
drop policy if exists training_signoffs_delete on public.training_signoffs;

drop policy if exists certifications_select on public.certifications;
drop policy if exists certifications_write  on public.certifications;

-- Content tables: also allow anon SELECT so the kiosk (no auth) can read.
drop policy if exists training_categories_select       on public.training_categories;
drop policy if exists training_courses_select          on public.training_courses;
drop policy if exists training_lessons_select          on public.training_lessons;
drop policy if exists training_lesson_resources_select on public.training_lesson_resources;
drop policy if exists training_quizzes_select          on public.training_quizzes;
drop policy if exists training_quiz_questions_select   on public.training_quiz_questions;
drop policy if exists training_quiz_options_select     on public.training_quiz_options;
drop policy if exists training_paths_select            on public.training_paths;
drop policy if exists training_path_courses_select     on public.training_path_courses;

create policy training_categories_select on public.training_categories
  for select to anon, authenticated using (true);
create policy training_courses_select on public.training_courses
  for select to anon, authenticated using (true);
create policy training_lessons_select on public.training_lessons
  for select to anon, authenticated using (true);
create policy training_lesson_resources_select on public.training_lesson_resources
  for select to anon, authenticated using (true);
create policy training_quizzes_select on public.training_quizzes
  for select to anon, authenticated using (true);
create policy training_quiz_questions_select on public.training_quiz_questions
  for select to anon, authenticated using (true);
create policy training_quiz_options_select on public.training_quiz_options
  for select to anon, authenticated using (true);
create policy training_paths_select on public.training_paths
  for select to anon, authenticated using (true);
create policy training_path_courses_select on public.training_path_courses
  for select to anon, authenticated using (true);

-- Progress / attempts / signoffs / certs / paths: manager-only reads.
-- All writes happen via server actions using the admin client.
create policy training_progress_manager_select on public.training_progress
  for select to authenticated using (public.training_can_write());

create policy training_quiz_attempts_manager_select on public.training_quiz_attempts
  for select to authenticated using (public.training_can_write());

create policy training_signoffs_manager_select on public.training_signoffs
  for select to authenticated using (public.training_can_write());

create policy certifications_manager_select on public.certifications
  for select to authenticated using (public.training_can_write());

create policy certifications_manager_write on public.certifications
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy staff_training_paths_manager_select on public.staff_training_paths
  for select to authenticated using (public.training_can_write());

create policy staff_training_paths_manager_write on public.staff_training_paths
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- training_staff: manager-only.
create policy training_staff_manager_select on public.training_staff
  for select to authenticated using (public.training_can_write());

create policy training_staff_manager_write on public.training_staff
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- =============================================================================
-- Kiosk PIN verification.
-- Wrap crypt() in a single RPC so the comparison happens inside Postgres
-- and we get one roundtrip. The function returns the staff_id on a
-- successful verify (and stamps last_seen_at) or null on failure.
-- =============================================================================
create or replace function public.kiosk_verify_pin(
  p_staff_id uuid,
  p_pin text
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_hash text;
begin
  select pin_hash into v_hash
    from public.training_staff
   where id = p_staff_id and is_active;
  if v_hash is null then return null; end if;
  if crypt(p_pin, v_hash) <> v_hash then return null; end if;

  update public.training_staff
    set last_seen_at = now()
   where id = p_staff_id;

  return p_staff_id;
end;
$fn$;

grant execute on function public.kiosk_verify_pin(uuid, text) to anon, authenticated;

-- Hash a PIN with bcrypt for storage. Server-side use only — gated by RLS
-- via the kiosk_admin_set_pin wrapper below.
create or replace function public.kiosk_hash_pin(p_pin text)
returns text
language sql
stable
as $fn$
  select crypt(p_pin, gen_salt('bf'));
$fn$;

grant execute on function public.kiosk_hash_pin(text) to authenticated;

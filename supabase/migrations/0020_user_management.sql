-- Phase 12 — User management
--   * Extend profiles with bio/title/start_date so the personal profile page
--     has somewhere to put them.
--   * Per-user notification preference toggles. One row per user.
--   * Allow admins to insert profile rows directly (we already invite via
--     Supabase admin API, but on-platform admins should be able to bootstrap
--     a profile if the auth row pre-exists).
--   * The avatars storage bucket + policies are already provisioned out of
--     band, so nothing storage-related here.

alter table public.profiles
  add column if not exists bio        text,
  add column if not exists job_title  text,
  add column if not exists start_date date;

-- Admin can insert profiles directly (eg. backfill or repair). The signup
-- trigger covers the normal invite path.
drop policy if exists profiles_insert_admin on public.profiles;
create policy profiles_insert_admin on public.profiles
  for insert to authenticated
  with check (public.is_admin());

-- Notification preferences. Each row is one user's prefs across all
-- channels. Keeping it as discrete boolean columns makes the UI trivial.
create table if not exists public.user_notification_preferences (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  email_on_new_lead    boolean not null default true,
  email_on_quote_paid  boolean not null default true,
  email_on_comment     boolean not null default true,
  email_on_assignment  boolean not null default true,
  digest_daily         boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create trigger user_notification_preferences_set_updated_at
before update on public.user_notification_preferences
for each row execute function public.set_updated_at();

alter table public.user_notification_preferences enable row level security;

drop policy if exists unp_select on public.user_notification_preferences;
create policy unp_select on public.user_notification_preferences
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists unp_insert on public.user_notification_preferences;
create policy unp_insert on public.user_notification_preferences
  for insert to authenticated
  with check (user_id = auth.uid() or public.is_admin());

drop policy if exists unp_update on public.user_notification_preferences;
create policy unp_update on public.user_notification_preferences
  for update to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

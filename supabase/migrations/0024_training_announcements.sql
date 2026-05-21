-- SWELL — Phase 4 extension: training announcements.
-- Pinned posts that appear on /training and on the dashboard. Authored
-- by managers (same write gate as the rest of the training content).

create table public.training_announcements (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  title       text not null check (length(trim(title)) > 0),
  body        text,
  pinned      boolean not null default false,
  expires_at  timestamptz,
  course_id   uuid references public.training_courses(id) on delete set null,
  path_id     uuid references public.training_paths(id) on delete set null
);

create index training_announcements_active_idx
  on public.training_announcements (pinned desc, created_at desc);

create trigger training_announcements_set_updated_at
before update on public.training_announcements
for each row execute function public.set_updated_at();

alter table public.training_announcements enable row level security;

create policy training_announcements_select on public.training_announcements
  for select to authenticated using (true);
create policy training_announcements_write on public.training_announcements
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

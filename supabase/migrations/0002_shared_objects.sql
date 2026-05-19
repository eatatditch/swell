-- SWELL — Phase 2 shared system objects
-- tasks, comments, attachments, activity_log, notifications, categories
-- plus storage buckets (avatars, attachments) and their policies.

-- =============================================================================
-- tasks
-- =============================================================================
create table public.tasks (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  location_id  uuid references public.locations(id) on delete set null,
  status       text not null default 'open'
               check (status in ('open','in_progress','blocked','done','archived')),
  priority     text not null default 'normal'
               check (priority in ('low','normal','high','urgent')),
  title        text not null check (length(trim(title)) > 0),
  description  text,
  assigned_to  uuid references public.profiles(id) on delete set null,
  due_date     timestamptz,
  source_type  text,
  source_id    uuid,
  completed_at timestamptz
);

create index tasks_assigned_status_idx
  on public.tasks (assigned_to, status);
create index tasks_location_due_idx
  on public.tasks (location_id, due_date);
create index tasks_source_idx
  on public.tasks (source_type, source_id);
create index tasks_open_idx
  on public.tasks (status)
  where status not in ('done','archived');

create trigger tasks_set_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

-- Stamp completed_at when status transitions to done.
create or replace function public.tasks_set_completed_at()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'done' and (old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;

create trigger tasks_completed_at_trigger
before update on public.tasks
for each row execute function public.tasks_set_completed_at();

-- =============================================================================
-- comments
-- =============================================================================
create table public.comments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  parent_type text not null,
  parent_id   uuid not null,
  body        text not null check (length(trim(body)) > 0),
  edited_at   timestamptz
);

create index comments_parent_idx
  on public.comments (parent_type, parent_id, created_at);

create trigger comments_set_updated_at
before update on public.comments
for each row execute function public.set_updated_at();

-- =============================================================================
-- attachments
-- =============================================================================
create table public.attachments (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  parent_type text not null,
  parent_id   uuid not null,
  bucket      text not null,
  path        text not null,
  filename    text not null,
  mime_type   text,
  size_bytes  bigint
);

create index attachments_parent_idx
  on public.attachments (parent_type, parent_id);

-- =============================================================================
-- activity_log (append-only)
-- =============================================================================
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  actor_id    uuid references public.profiles(id) on delete set null,
  location_id uuid references public.locations(id) on delete set null,
  verb        text not null,
  object_type text not null,
  object_id   uuid not null,
  summary     text,
  metadata    jsonb not null default '{}'::jsonb
);

create index activity_object_idx
  on public.activity_log (object_type, object_id, created_at desc);
create index activity_location_idx
  on public.activity_log (location_id, created_at desc);
create index activity_actor_idx
  on public.activity_log (actor_id, created_at desc);

-- =============================================================================
-- notifications
-- =============================================================================
create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  kind         text not null,
  title        text not null,
  body         text,
  link         text,
  read_at      timestamptz,
  source_type  text,
  source_id    uuid
);

create index notifications_recipient_unread_idx
  on public.notifications (recipient_id, read_at, created_at desc);

-- =============================================================================
-- categories
-- =============================================================================
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  slug        text not null unique,
  name        text not null,
  module      text not null,
  parent_id   uuid references public.categories(id) on delete set null,
  sort_order  int not null default 0
);

create index categories_module_idx on public.categories (module);

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.tasks enable row level security;
alter table public.comments enable row level security;
alter table public.attachments enable row level security;
alter table public.activity_log enable row level security;
alter table public.notifications enable row level security;
alter table public.categories enable row level security;

-- tasks: visible to admin, the assignee, the creator, or anyone with
-- location access when the task is location-scoped.
create policy tasks_select on public.tasks
  for select to authenticated using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
    or (location_id is null)
    or (location_id = any(public.current_user_location_ids()))
  );

create policy tasks_insert on public.tasks
  for insert to authenticated with check (
    created_by = auth.uid()
    and (
      location_id is null
      or public.has_location_access(location_id)
    )
  );

create policy tasks_update on public.tasks
  for update to authenticated using (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  ) with check (
    public.is_admin()
    or assigned_to = auth.uid()
    or created_by = auth.uid()
  );

create policy tasks_delete on public.tasks
  for delete to authenticated using (public.is_admin());

-- comments: authenticated users can read; only creator (or admin) can
-- edit / delete. Insert requires created_by = auth.uid().
create policy comments_select on public.comments
  for select to authenticated using (true);

create policy comments_insert on public.comments
  for insert to authenticated with check (created_by = auth.uid());

create policy comments_update on public.comments
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check (created_by = auth.uid() or public.is_admin());

create policy comments_delete on public.comments
  for delete to authenticated using (
    created_by = auth.uid() or public.is_admin()
  );

-- attachments: same model as comments. No update policy (immutable).
create policy attachments_select on public.attachments
  for select to authenticated using (true);

create policy attachments_insert on public.attachments
  for insert to authenticated with check (created_by = auth.uid());

create policy attachments_delete on public.attachments
  for delete to authenticated using (
    created_by = auth.uid() or public.is_admin()
  );

-- activity_log: read scoped by location for non-admins; no user writes
-- (server actions use service-role-equivalent paths or run as the actor
-- via INSERT with check that actor_id = auth.uid()).
create policy activity_select on public.activity_log
  for select to authenticated using (
    public.is_admin()
    or location_id is null
    or location_id = any(public.current_user_location_ids())
  );

create policy activity_insert on public.activity_log
  for insert to authenticated with check (
    actor_id = auth.uid()
  );

-- notifications: recipient-only reads; recipient marks read; no client
-- inserts (server-only — service role or invoked from a server action
-- using the recipient's own session is not allowed).
create policy notifications_select on public.notifications
  for select to authenticated using (
    recipient_id = auth.uid() or public.is_admin()
  );

create policy notifications_update on public.notifications
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Inserts are admin-only at the RLS level; routine notification writes
-- come from the service-role client in server actions.
create policy notifications_insert_admin on public.notifications
  for insert to authenticated with check (public.is_admin());

create policy notifications_delete on public.notifications
  for delete to authenticated using (
    recipient_id = auth.uid() or public.is_admin()
  );

-- categories: read all authenticated; admin write.
create policy categories_select on public.categories
  for select to authenticated using (true);

create policy categories_write_admin on public.categories
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- Storage buckets
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Storage policies. We scope by bucket_id and require authentication
-- for writes. For 'avatars', the user must own the first folder segment.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'attachments_read_authenticated'
  ) then
    create policy attachments_read_authenticated
      on storage.objects for select to authenticated
      using (bucket_id = 'attachments');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'attachments_insert_authenticated'
  ) then
    create policy attachments_insert_authenticated
      on storage.objects for insert to authenticated
      with check (bucket_id = 'attachments' and owner = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'attachments_delete_owner'
  ) then
    create policy attachments_delete_owner
      on storage.objects for delete to authenticated
      using (bucket_id = 'attachments' and (owner = auth.uid() or public.is_admin()));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_read_public'
  ) then
    create policy avatars_read_public
      on storage.objects for select to anon, authenticated
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_insert_self'
  ) then
    create policy avatars_insert_self
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'avatars'
        and (storage.foldername(name))[1] = auth.uid()::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'avatars_update_self'
  ) then
    create policy avatars_update_self
      on storage.objects for update to authenticated
      using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
      with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
  end if;
end;
$$;

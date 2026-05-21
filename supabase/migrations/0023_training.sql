-- SWELL — Phase 4 Surf School / Training
-- training_categories, training_courses, training_lessons,
-- training_lesson_resources, training_quizzes, training_quiz_questions,
-- training_quiz_options, training_quiz_attempts, training_paths,
-- training_path_courses, user_training_paths, training_progress,
-- training_signoffs, certifications.
--
-- Content is read by anyone authenticated; writes are managers (founder_admin
-- and general_manager) plus the department-specific roles for their
-- department (kitchen_manager writes BOH content, service_manager writes
-- FOH, etc.). Progress / attempts / signoffs are scoped per-user with
-- managers reading all.

-- =============================================================================
-- training_categories
-- =============================================================================
create table public.training_categories (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  slug        text not null unique check (length(trim(slug)) > 0),
  name        text not null check (length(trim(name)) > 0),
  description text,
  department  text references public.departments(slug) on delete set null,
  icon        text,
  sort_order  int not null default 0,
  is_active   boolean not null default true
);

create index training_categories_dept_idx on public.training_categories (department);

create trigger training_categories_set_updated_at
before update on public.training_categories
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_courses
-- =============================================================================
create table public.training_courses (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  created_by         uuid references auth.users(id) on delete set null,
  category_id        uuid references public.training_categories(id) on delete set null,
  slug               text not null unique check (length(trim(slug)) > 0),
  title              text not null check (length(trim(title)) > 0),
  description        text,
  estimated_minutes  int check (estimated_minutes is null or estimated_minutes > 0),
  is_required        boolean not null default false,
  requires_signoff   boolean not null default false,
  sort_order         int not null default 0,
  is_active          boolean not null default true,
  tags               text[] not null default '{}'::text[],
  target_roles       text[] not null default '{}'::text[]
);

create index training_courses_category_idx
  on public.training_courses (category_id, sort_order);
create index training_courses_active_idx
  on public.training_courses (is_active);
create index training_courses_target_roles_idx
  on public.training_courses using gin (target_roles);

create trigger training_courses_set_updated_at
before update on public.training_courses
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_lessons
-- =============================================================================
create table public.training_lessons (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,
  course_id         uuid not null references public.training_courses(id) on delete cascade,
  slug              text not null check (length(trim(slug)) > 0),
  title             text not null check (length(trim(title)) > 0),
  position          int not null default 0,
  -- Markdown-rendered body.
  content           text,
  -- Primary video — additional media goes in training_lesson_resources.
  video_url         text,
  estimated_minutes int check (estimated_minutes is null or estimated_minutes > 0),
  is_active         boolean not null default true,
  unique (course_id, slug),
  unique (course_id, position)
);

create index training_lessons_course_idx
  on public.training_lessons (course_id, position);

create trigger training_lessons_set_updated_at
before update on public.training_lessons
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_lesson_resources (links, PDFs, supplementary videos, images)
-- =============================================================================
create table public.training_lesson_resources (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  lesson_id   uuid not null references public.training_lessons(id) on delete cascade,
  kind        text not null check (kind in ('video','pdf','image','link','download')),
  url         text not null check (length(trim(url)) > 0),
  label       text,
  position    int not null default 0,
  is_printable boolean not null default false
);

create index training_lesson_resources_lesson_idx
  on public.training_lesson_resources (lesson_id, position);

create trigger training_lesson_resources_set_updated_at
before update on public.training_lesson_resources
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_quizzes
-- One quiz per lesson at most, but a quiz can also stand alone on a course.
-- =============================================================================
create table public.training_quizzes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  course_id       uuid references public.training_courses(id) on delete cascade,
  lesson_id       uuid references public.training_lessons(id) on delete cascade,
  title           text not null check (length(trim(title)) > 0),
  description     text,
  passing_score   int not null default 80 check (passing_score between 0 and 100),
  retry_limit     int not null default 0 check (retry_limit >= 0),
  is_active       boolean not null default true,
  -- At least one of course_id / lesson_id.
  check (course_id is not null or lesson_id is not null)
);

create unique index training_quizzes_lesson_unique
  on public.training_quizzes (lesson_id)
  where lesson_id is not null;
create index training_quizzes_course_idx
  on public.training_quizzes (course_id);

create trigger training_quizzes_set_updated_at
before update on public.training_quizzes
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_quiz_questions
-- =============================================================================
create table public.training_quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  quiz_id       uuid not null references public.training_quizzes(id) on delete cascade,
  position      int not null default 0,
  kind          text not null check (kind in ('multiple_choice','true_false','short_answer')),
  prompt        text not null check (length(trim(prompt)) > 0),
  explanation   text,
  -- For short_answer only — pipe-separated accepted answers.
  correct_text  text
);

create index training_quiz_questions_quiz_idx
  on public.training_quiz_questions (quiz_id, position);

create trigger training_quiz_questions_set_updated_at
before update on public.training_quiz_questions
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_quiz_options (multiple_choice / true_false)
-- =============================================================================
create table public.training_quiz_options (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  question_id   uuid not null references public.training_quiz_questions(id) on delete cascade,
  label         text not null check (length(trim(label)) > 0),
  is_correct    boolean not null default false,
  position      int not null default 0
);

create index training_quiz_options_q_idx
  on public.training_quiz_options (question_id, position);

create trigger training_quiz_options_set_updated_at
before update on public.training_quiz_options
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_quiz_attempts
-- =============================================================================
create table public.training_quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  quiz_id       uuid not null references public.training_quizzes(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  score         int not null check (score between 0 and 100),
  passed        boolean not null,
  answers       jsonb not null default '{}'::jsonb,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz not null default now()
);

create index training_quiz_attempts_user_idx
  on public.training_quiz_attempts (user_id, quiz_id, completed_at desc);
create index training_quiz_attempts_quiz_idx
  on public.training_quiz_attempts (quiz_id, passed, completed_at desc);

-- =============================================================================
-- training_paths (role-based curricula)
-- =============================================================================
create table public.training_paths (
  id                    uuid primary key default gen_random_uuid(),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  created_by            uuid references auth.users(id) on delete set null,
  name                  text not null check (length(trim(name)) > 0),
  description           text,
  target_roles          text[] not null default '{}'::text[],
  target_department     text references public.departments(slug) on delete set null,
  -- Default days-per-course used to stamp module due dates on assignment.
  course_interval_days  int not null default 7 check (course_interval_days > 0),
  is_active             boolean not null default true,
  sort_order            int not null default 0
);

create index training_paths_active_idx on public.training_paths (is_active);
create index training_paths_target_roles_idx
  on public.training_paths using gin (target_roles);

create trigger training_paths_set_updated_at
before update on public.training_paths
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_path_courses
-- =============================================================================
create table public.training_path_courses (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  path_id     uuid not null references public.training_paths(id) on delete cascade,
  course_id   uuid not null references public.training_courses(id) on delete cascade,
  position    int not null default 0,
  is_required boolean not null default true,
  unique (path_id, course_id)
);

create index training_path_courses_path_idx
  on public.training_path_courses (path_id, position);

create trigger training_path_courses_set_updated_at
before update on public.training_path_courses
for each row execute function public.set_updated_at();

-- =============================================================================
-- user_training_paths
-- =============================================================================
create table public.user_training_paths (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  path_id         uuid not null references public.training_paths(id) on delete cascade,
  assigned_by     uuid references public.profiles(id) on delete set null,
  -- 'role' (auto-assigned from role match) | 'manual' (manager assigned).
  assigned_reason text not null default 'manual'
                  check (assigned_reason in ('role','manual')),
  due_date        date,
  completed_at    timestamptz,
  unique (user_id, path_id)
);

create index user_training_paths_user_idx on public.user_training_paths (user_id);
create index user_training_paths_path_idx on public.user_training_paths (path_id);

create trigger user_training_paths_set_updated_at
before update on public.user_training_paths
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_progress (per-user, per-lesson)
-- =============================================================================
create table public.training_progress (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  lesson_id           uuid not null references public.training_lessons(id) on delete cascade,
  completed_at        timestamptz not null default now(),
  time_spent_seconds  int,
  unique (user_id, lesson_id)
);

create index training_progress_user_idx
  on public.training_progress (user_id, completed_at desc);
create index training_progress_lesson_idx
  on public.training_progress (lesson_id);

create trigger training_progress_set_updated_at
before update on public.training_progress
for each row execute function public.set_updated_at();

-- =============================================================================
-- training_signoffs (manager verifies an employee on a course)
-- =============================================================================
create table public.training_signoffs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  course_id       uuid not null references public.training_courses(id) on delete cascade,
  signed_by       uuid not null references public.profiles(id) on delete restrict,
  signed_at       timestamptz not null default now(),
  notes           text,
  unique (user_id, course_id)
);

create index training_signoffs_user_idx
  on public.training_signoffs (user_id, signed_at desc);
create index training_signoffs_course_idx
  on public.training_signoffs (course_id);

create trigger training_signoffs_set_updated_at
before update on public.training_signoffs
for each row execute function public.set_updated_at();

-- =============================================================================
-- certifications (food handler, ServSafe, TIPS, etc.)
-- =============================================================================
create table public.certifications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  created_by      uuid references auth.users(id) on delete set null,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  kind            text not null check (length(trim(kind)) > 0),
  name            text not null check (length(trim(name)) > 0),
  issuing_body    text,
  issued_on       date not null,
  expires_on      date,
  document_url    text,
  notes           text
);

create index certifications_user_idx
  on public.certifications (user_id, expires_on);
create index certifications_expiring_idx
  on public.certifications (expires_on)
  where expires_on is not null;

create trigger certifications_set_updated_at
before update on public.certifications
for each row execute function public.set_updated_at();

-- =============================================================================
-- Helper: content_can_write — which roles can manage training content.
-- =============================================================================
create or replace function public.training_can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role in (
      'founder_admin',
      'general_manager',
      'service_manager',
      'kitchen_manager'
    )
    from public.profiles
    where id = auth.uid()
  ), false);
$$;

-- =============================================================================
-- RLS
-- =============================================================================
alter table public.training_categories       enable row level security;
alter table public.training_courses          enable row level security;
alter table public.training_lessons          enable row level security;
alter table public.training_lesson_resources enable row level security;
alter table public.training_quizzes          enable row level security;
alter table public.training_quiz_questions   enable row level security;
alter table public.training_quiz_options     enable row level security;
alter table public.training_quiz_attempts    enable row level security;
alter table public.training_paths            enable row level security;
alter table public.training_path_courses     enable row level security;
alter table public.user_training_paths       enable row level security;
alter table public.training_progress         enable row level security;
alter table public.training_signoffs         enable row level security;
alter table public.certifications            enable row level security;

-- Content tables — read by any authenticated user, write by manager roles.
create policy training_categories_select on public.training_categories
  for select to authenticated using (true);
create policy training_categories_write on public.training_categories
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_courses_select on public.training_courses
  for select to authenticated using (true);
create policy training_courses_write on public.training_courses
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_lessons_select on public.training_lessons
  for select to authenticated using (true);
create policy training_lessons_write on public.training_lessons
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_lesson_resources_select on public.training_lesson_resources
  for select to authenticated using (true);
create policy training_lesson_resources_write on public.training_lesson_resources
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_quizzes_select on public.training_quizzes
  for select to authenticated using (true);
create policy training_quizzes_write on public.training_quizzes
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- Quiz questions / options: readable to all authenticated users, but the
-- right-answer fields (correct_text, is_correct) are intentionally exposed
-- in the schema. Grading is done server-side so a client read of the truth
-- is fine; we accept the modest "answer-key visible to a savvy user"
-- tradeoff in exchange for keeping the read path simple. Tighten in V2 if
-- we surface admin-only quizzes.
create policy training_quiz_questions_select on public.training_quiz_questions
  for select to authenticated using (true);
create policy training_quiz_questions_write on public.training_quiz_questions
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_quiz_options_select on public.training_quiz_options
  for select to authenticated using (true);
create policy training_quiz_options_write on public.training_quiz_options
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_paths_select on public.training_paths
  for select to authenticated using (true);
create policy training_paths_write on public.training_paths
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

create policy training_path_courses_select on public.training_path_courses
  for select to authenticated using (true);
create policy training_path_courses_write on public.training_path_courses
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- Quiz attempts — user sees own; managers see all.
create policy training_quiz_attempts_select on public.training_quiz_attempts
  for select to authenticated using (
    user_id = auth.uid() or public.training_can_write()
  );

create policy training_quiz_attempts_insert on public.training_quiz_attempts
  for insert to authenticated with check (user_id = auth.uid());

create policy training_quiz_attempts_delete on public.training_quiz_attempts
  for delete to authenticated using (public.is_admin());

-- user_training_paths — user sees own; managers write any.
create policy user_training_paths_select on public.user_training_paths
  for select to authenticated using (
    user_id = auth.uid() or public.training_can_write()
  );
create policy user_training_paths_write on public.user_training_paths
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- training_progress — user marks own; managers read all.
create policy training_progress_select on public.training_progress
  for select to authenticated using (
    user_id = auth.uid() or public.training_can_write()
  );
create policy training_progress_insert on public.training_progress
  for insert to authenticated with check (user_id = auth.uid());
create policy training_progress_update on public.training_progress
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy training_progress_delete on public.training_progress
  for delete to authenticated using (
    user_id = auth.uid() or public.is_admin()
  );

-- training_signoffs — manager sign-off only; user reads own; managers read all.
create policy training_signoffs_select on public.training_signoffs
  for select to authenticated using (
    user_id = auth.uid() or public.training_can_write()
  );
create policy training_signoffs_insert on public.training_signoffs
  for insert to authenticated with check (
    public.training_can_write() and signed_by = auth.uid()
  );
create policy training_signoffs_delete on public.training_signoffs
  for delete to authenticated using (public.is_admin());

-- certifications — user sees own; managers see all + write.
create policy certifications_select on public.certifications
  for select to authenticated using (
    user_id = auth.uid() or public.training_can_write()
  );
create policy certifications_write on public.certifications
  for all to authenticated
  using (public.training_can_write())
  with check (public.training_can_write());

-- =============================================================================
-- Seed: one FOH category and one starter course so /training has content.
-- =============================================================================
do $$
declare
  brand_cat_id uuid;
  brand_course_id uuid;
  lesson1_id uuid;
  lesson2_id uuid;
  quiz_id uuid;
  q1_id uuid;
  q2_id uuid;
  q3_id uuid;
begin
  if not exists (select 1 from public.training_categories where slug = 'brand-culture') then
    insert into public.training_categories (slug, name, description, department, sort_order, icon)
    values (
      'brand-culture',
      'Brand & Culture',
      'Who we are, what we stand for, how we show up.',
      null,
      10,
      'heart'
    )
    returning id into brand_cat_id;

    insert into public.training_courses (
      category_id, slug, title, description,
      estimated_minutes, is_required, requires_signoff, sort_order, target_roles
    )
    values (
      brand_cat_id,
      'welcome-to-swell',
      'Welcome to SWELL',
      'Our story, our standards, and what your first week looks like.',
      20,
      true,
      false,
      10,
      array['team_member','service_manager','kitchen_manager','general_manager','catering_manager','marketing_manager']
    )
    returning id into brand_course_id;

    insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
    values (
      brand_course_id,
      'our-story',
      'Our Story',
      10,
      e'## Why we exist\n\nSWELL exists to make running a restaurant feel less like ' ||
      e'putting out fires and more like building something. Read this, take it in, ' ||
      e'and bring it to every shift.\n\n- We sweat the small stuff.\n- We treat each ' ||
      e'guest like we want them coming back tomorrow.\n- We back each other up.',
      5
    )
    returning id into lesson1_id;

    insert into public.training_lessons (course_id, slug, title, position, content, estimated_minutes)
    values (
      brand_course_id,
      'standards',
      'Standards',
      20,
      e'## The standards we hold\n\n1. Show up on time, in uniform.\n' ||
      e'2. Phones away on the floor.\n3. Greet every guest within 30 seconds.\n' ||
      e'4. If you see it, you own it.',
      5
    )
    returning id into lesson2_id;

    insert into public.training_quizzes (lesson_id, title, passing_score, retry_limit)
    values (lesson2_id, 'Standards check', 80, 0)
    returning id into quiz_id;

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      quiz_id, 10, 'multiple_choice',
      'How quickly should a guest be greeted?',
      'Thirty seconds is the SWELL standard.'
    )
    returning id into q1_id;

    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (q1_id, 'Within 30 seconds', true,  10),
      (q1_id, 'Within 2 minutes',  false, 20),
      (q1_id, 'When you can',      false, 30);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation)
    values (
      quiz_id, 20, 'true_false',
      'Phones are fine on the floor as long as you''re quick.',
      'Phones away on the floor — full stop.'
    )
    returning id into q2_id;

    insert into public.training_quiz_options (question_id, label, is_correct, position) values
      (q2_id, 'True',  false, 10),
      (q2_id, 'False', true,  20);

    insert into public.training_quiz_questions (quiz_id, position, kind, prompt, explanation, correct_text)
    values (
      quiz_id, 30, 'short_answer',
      'Finish the sentence: "If you see it, you ____ it."',
      'Ownership over excuses.',
      'own'
    );
  end if;
end;
$$;

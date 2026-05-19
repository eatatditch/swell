# SWELL — Database Schema Plan

This document describes the full Supabase / Postgres schema for SWELL.
Phase 1 builds only the **foundation** tables. The rest are sketched so
we know the shape we are growing into and can avoid painting ourselves
into a corner.

The database is **Postgres on Supabase**. Auth lives in `auth.users`.
Application data lives in the `public` schema. RLS is **on** for every
table that holds operational data.

---

## 1. Conventions

### Required columns on every operational table

| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` pk | `default gen_random_uuid()` |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | `default now()`, kept honest by trigger |
| `created_by` | `uuid` | FK `auth.users.id`, nullable for system rows |
| `location_id` | `uuid` | FK `locations.id`, nullable for company-wide rows |
| `status` | `text` | Constrained by check (see Status section) |

### Optional standard columns

- `owner_id` / `assigned_to` — FK `profiles.id`. Used wherever a row
  has a clear human owner (tasks, leads, recoveries, follow-ups).
- `due_date` — `date` or `timestamptz` when timing matters.
- `priority` — `text` check (`low`, `normal`, `high`, `urgent`).
- `archived_at` — `timestamptz`, nullable. Soft delete is by
  `status = 'archived'` and stamping this column.

### Triggers

- `set_updated_at()` — `BEFORE UPDATE` on every operational table,
  sets `updated_at = now()`.
- `handle_new_user()` — `AFTER INSERT` on `auth.users`, inserts a row
  into `profiles` with role `team_member`.
- `log_activity()` — generic trigger reused per table to write to
  `activity_log`.

### Status conventions

We use a small vocabulary across modules:

- Lifecycle: `draft`, `active`, `archived`
- Workflow: `open`, `in_progress`, `blocked`, `done`
- Pipeline: `new`, `qualified`, `proposal`, `won`, `lost`
- Approval: `pending`, `approved`, `rejected`

Each table picks the subset it needs and enforces it with a check.

### Helper functions

- `current_user_role() returns text` — reads `profiles.role` for `auth.uid()`.
- `current_user_location_ids() returns uuid[]` — expands a user's
  assignments, with `company_wide` rolling up to every location id.
- `is_admin() returns boolean` — `current_user_role() = 'founder_admin'`.
- `has_location_access(loc uuid) returns boolean` — convenience used in
  RLS policies.

---

## 2. Phase 1 Foundation Tables (built now)

### `locations`

The four operating scopes. `company_wide` is a real row used as a
virtual scope by admin / marketing / catering / founder.

```
id            uuid pk
slug          text unique         -- 'bay_shore' | 'port_jefferson' | 'kings_park' | 'company_wide'
name          text
is_active     boolean default true
sort_order    int default 0
created_at    timestamptz
updated_at    timestamptz
```

Indexes: `unique(slug)`.

### `profiles`

Mirrors `auth.users` 1:1.

```
id            uuid pk references auth.users(id) on delete cascade
email         text unique
full_name     text
avatar_url    text
role          text not null check (role in (...))
is_active     boolean default true
phone         text
created_at    timestamptz
updated_at    timestamptz
```

`role` enum (text + check): `founder_admin`, `general_manager`,
`service_manager`, `kitchen_manager`, `marketing_manager`,
`catering_manager`, `team_member`.

Indexes: `unique(email)`, `btree(role)`.

### `user_location_assignments`

Many-to-many. Which locations a user can operate in.

```
id            uuid pk
user_id       uuid references profiles(id) on delete cascade
location_id   uuid references locations(id) on delete cascade
created_at    timestamptz
unique (user_id, location_id)
```

Indexes: `unique(user_id, location_id)`, `btree(user_id)`,
`btree(location_id)`.

### `departments` *(seed only in Phase 1)*

Used by training paths and some module categorization. Seeded with
`foh`, `boh`, `management`, `marketing`, `catering`, `admin`.

```
id            uuid pk
slug          text unique
name          text
created_at    timestamptz
```

### Phase 1 RLS

- `locations`: read by any authenticated user; write only by admins.
- `profiles`: a user reads / updates their own row; admins read all and
  write `role` / `is_active`.
- `user_location_assignments`: a user reads their own; admins write.
- `departments`: read all authenticated; admin writes.

---

## 3. Phase 2 Shared System Objects (sketch)

Built once, used everywhere. Built in Phase 2 before any module's
features need them.

### `tasks`

Generic actionable work. Each task can be linked to one source row in
another module via `source_type` + `source_id`.

```
id, created_at, updated_at, created_by, location_id, status
title              text
description        text
assigned_to        uuid references profiles(id)
due_date           timestamptz
priority           text check (...)
source_type        text          -- 'manager_log', 'guest_incident', 'catering_lead', ...
source_id          uuid          -- the row in that module
completed_at       timestamptz
```

Indexes: `(assigned_to, status)`, `(location_id, due_date)`,
`(source_type, source_id)`.

### `comments`

```
id, created_at, updated_at, created_by
parent_type        text          -- the table being commented on
parent_id          uuid
body               text
edited_at          timestamptz
```

Indexes: `(parent_type, parent_id, created_at)`.

### `attachments`

Pointers into Supabase Storage.

```
id, created_at, created_by
parent_type        text
parent_id          uuid
bucket             text
path               text
filename           text
mime_type          text
size_bytes         bigint
```

Indexes: `(parent_type, parent_id)`.

### `activity_log`

Append-only. Written by triggers and by server actions for things
triggers can't see.

```
id              uuid pk
created_at      timestamptz default now()
actor_id        uuid          -- profiles.id, null for system
location_id     uuid
verb            text          -- 'created' | 'updated' | 'completed' | 'commented' | 'signed_off' | ...
object_type     text
object_id       uuid
summary         text
metadata        jsonb
```

Indexes: `(object_type, object_id, created_at)`,
`(location_id, created_at)`.

### `notifications`

```
id              uuid pk
created_at      timestamptz
recipient_id    uuid references profiles(id)
kind            text          -- 'task_assigned' | 'mention' | 'signoff_requested' | ...
title           text
body            text
link            text
read_at         timestamptz
source_type     text
source_id       uuid
```

Indexes: `(recipient_id, read_at)`.

### `categories`

Generic taxonomy for tagging across modules.

```
id              uuid pk
slug            text unique
name            text
module          text          -- which module owns this category
parent_id       uuid          -- nullable, for hierarchy
sort_order      int
created_at      timestamptz
```

Indexes: `unique(slug)`, `(module)`.

---

## 4. Module Tables (sketch)

### Daily Ops (Phase 3)

- `checklists` — template (opening / closing / pre-shift)
- `checklist_items` — line items, ordered
- `checklist_completions` — one occurrence of a checklist at a location
  on a date, with per-item rows
- `manager_logs` — narrative entry per shift per location
- `shift_notes` — short, structured notes (handoff)
- `eighty_sixed_items` — what's 86'd, where, why, until when
- `maintenance_issues` — open issues, owner, status
- `guest_incidents` — feeds into Guest Experience
- `comp_void_notes` — comp / void with manager, reason, amount

### Kitchen (Phase 6)

- `kitchen_prep_lists` (template)
- `kitchen_prep_items`
- `kitchen_prep_runs` (a list executed on a date)
- `par_levels` — per item per location
- `waste_logs`
- `line_checks`
- `cleaning_checklists` *(uses the generic checklist tables via
  `kind = 'cleaning'`)*
- `vendor_issues`, `equipment_issues`
- `kitchen_shift_notes`

### Surf School / Training (Phase 4)

- `training_categories`
- `training_courses`
- `training_lessons` *(text, video URL, attachments)*
- `training_quizzes`, `quiz_questions`, `quiz_options`
- `quiz_attempts`
- `training_paths` — role-based path of courses
- `training_progress` — per user per lesson
- `training_signoffs` — manager sign-off events
- `certifications` — food handler, ServSafe, with expiration

### Specs & Menus (Phase 5)

- `menu_items` *(name, status, station, season)*
- `food_specs`, `cocktail_specs`, `build_sheets`
- `garnishes`, `allergens`, `menu_item_allergens`
- `spec_versions` — version history
- `spec_photos` *(uses `attachments`)*

### Catering & Events (Phase 7)

- `catering_leads` — pipeline
- `catering_followups`
- `catering_events` — BEO sheet
- `event_notes`
- `event_payments` — deposits, balance, status
- `event_ugc_opportunities`
- `event_review_requests`

### Marketing (Phase 8)

- `marketing_campaigns`
- `content_items` — calendar entries
- `creative_briefs`
- `shot_lists`, `shot_list_items`
- `ad_requests`
- `email_sms_campaigns`
- `ugc_creators`, `ugc_collaborations`
- `campaign_approvals`
- `campaign_performance_notes`

### Guest Experience (Phase 9)

- `guest_profiles` — name, contact, VIP flag, preferences
- `guest_recoveries`
- `comp_history` *(derived view over `comp_void_notes`)*
- `review_tracking`
- `vip_notes`
- `surprise_delight_opportunities`
- `surf_club_opportunities`

### Scoreboard (Phase 10)

- `scoreboard_entries` — daily, per location: sales, covers, labor,
  COGS, check average, etc.
- `weekly_recaps` — per location per ISO week
- `manager_scorecards` — accountability metrics

### Founder View (Phase 11)

- `founder_priorities` — strategic priorities, owner, status
- `decision_logs` — date, decision, context, owner, follow-up
- `founder_cash_snapshots` — manual entry of cash position by week
  (no bank integration in V1)

### Admin

- `audit_log` — append-only, distinct from `activity_log` because it
  records *admin* events (role changes, location changes, deletions).
- `system_settings` — single-row key/value config.

---

## 5. Storage Buckets

Supabase Storage:

| Bucket | Public? | Purpose |
|---|---|---|
| `avatars` | public read | Profile photos. |
| `spec_photos` | authenticated read | Food / cocktail / build-sheet photos. |
| `training_resources` | authenticated read | Lesson videos, PDFs. |
| `marketing_assets` | authenticated read | Shot list output, campaign assets. |
| `event_attachments` | authenticated read | BEO PDFs, signed contracts. |
| `attachments` | authenticated read | Generic attachments referenced by `attachments.path`. |

Bucket policies mirror RLS: authenticated users only, scoped by
`location_id` where the parent row enforces it.

---

## 6. Index Strategy

Beyond the per-table notes above:

- Every FK has a btree index.
- Hot lookups documented inline.
- `(location_id, created_at desc)` on every module's main table for
  recent-activity views.
- `(assigned_to, status)` on `tasks`.
- `(parent_type, parent_id)` on `comments`, `attachments`,
  `activity_log`.
- Partial index on `tasks(status) where status <> 'done'` for
  "Open Issues" views.

---

## 7. RLS Strategy

Three patterns cover ~all tables:

1. **Self-only** (e.g. `profiles`, `notifications`):
   `auth.uid() = id` (or `recipient_id`).
2. **Location-scoped** (e.g. `manager_logs`, `kitchen_prep_runs`):
   `is_admin() OR location_id = any(current_user_location_ids())`.
3. **Company-wide read, scoped write** (e.g. `marketing_campaigns`):
   read for any authenticated; write for the owning role(s).

Every table has an explicit `select`, `insert`, `update`, and `delete`
policy. We do not rely on the implicit deny default to document intent.

Service-role access is server-only (Next.js server actions / route
handlers) and never reaches the browser.

---

## 8. Migration Order

1. `0001_initial_schema.sql` — extensions (`pgcrypto`), `locations`,
   `profiles`, `user_location_assignments`, `departments`, helpers,
   `set_updated_at` trigger, `handle_new_user` trigger, RLS, seed
   `locations` and `departments`. **This is the Phase 1 migration.**
2. `0002_shared_objects.sql` — `tasks`, `comments`, `attachments`,
   `activity_log`, `notifications`, `categories`.
3. Subsequent migrations are numbered per phase / module.

Migration files live in `supabase/migrations/`. We never edit a
migration after it has been applied to a remote project.

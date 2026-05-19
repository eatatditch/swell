# SWELL — Supabase Setup

What needs to exist in Supabase for SWELL to run. The Phase 1 setup is
intentionally minimal; later phases add migrations, buckets, and
policies.

---

## 1. Projects

We run **three** Supabase projects:

| Env | Purpose | URL |
|---|---|---|
| Local | Developer machines via `supabase start`. | `http://localhost:54321` |
| Staging | Long-lived test project. Vercel preview deployments point here. | `swell-staging` |
| Production | Live. Vercel production deployment points here. | `swell-prod` |

Each project has its own URL, anon key, service role key, JWT secret.
None of these values cross environments.

---

## 2. Auth

### Providers

- **Email + password** — enabled.
- **Magic link** — optional, off in V1.
- **OAuth providers** — off in V1.

### Settings

- Disable public sign-ups in production. Users are invited by an admin.
  In local / staging, public sign-up may be on for testing.
- Confirm email: **on** in production, **off** in local.
- Site URL: the Vercel deployment URL per environment.
- Redirect URLs: `<site>/auth/callback` plus the Vercel preview URL
  pattern.
- Password policy: minimum 10 characters.

### Triggers

`handle_new_user()` runs `AFTER INSERT ON auth.users` and inserts a
matching row in `public.profiles` with `role = 'team_member'`.

---

## 3. Database

### Extensions

- `pgcrypto` — for `gen_random_uuid()`.

### Schema

The `public` schema holds all application tables. The full plan is in
`DATABASE_SCHEMA_PLAN.md`. Phase 1 creates:

- `locations`
- `profiles`
- `user_location_assignments`
- `departments`
- Helper functions (`current_user_role`, `current_user_location_ids`,
  `is_admin`, `has_location_access`).
- Triggers (`set_updated_at`, `handle_new_user`).
- RLS policies on every table created.

### Seed data

Phase 1 seeds:

- Four locations: Bay Shore, Port Jefferson, Kings Park, Company-wide.
- Six departments: FOH, BOH, Management, Marketing, Catering, Admin.

Seed runs as part of `0001_initial_schema.sql`. We do not seed users,
fake guests, or any operational data.

---

## 4. Row Level Security

RLS is **on** for every table in `public`. The default deny is relied
upon, but every table also has explicit policies so intent is visible.

Common policy shapes (see `DATABASE_SCHEMA_PLAN.md` §7):

1. Self-only — `auth.uid() = id`.
2. Location-scoped — `is_admin() OR location_id = any(current_user_location_ids())`.
3. Company-wide read, scoped write — read for any authenticated; write
   for the owning role.

Service-role usage is server-only (Next.js server actions and route
handlers). The service key never reaches the browser. Anything that
needs the service key is wrapped in a server-only module.

---

## 5. Storage

Buckets created in Phase 2:

| Bucket | Public read | Notes |
|---|---|---|
| `avatars` | Yes | Profile photos. |
| `spec_photos` | No, authenticated | Food / cocktail spec photos. |
| `training_resources` | No, authenticated | Lesson videos, PDFs. |
| `marketing_assets` | No, authenticated | Campaign assets. |
| `event_attachments` | No, authenticated | BEO PDFs, contracts. |
| `attachments` | No, authenticated | Generic, referenced by `attachments.path`. |

Bucket policies are written so a user can only read / write objects
whose parent row they can read / write per RLS.

---

## 6. Environment variables

The Next.js app expects:

| Var | Where | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server | Supabase client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser + server | Supabase client. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin-only server actions. |
| `NEXT_PUBLIC_APP_URL` | Browser + server | Absolute URL for emails / OG. |

`.env.example` lists these. `.env.local` is git-ignored. Vercel project
settings carry the staging and production values separately.

`SUPABASE_SERVICE_ROLE_KEY` is **never** imported from a client
component, an exported page, or any file under `app/**` that is not
explicitly server-only. We isolate it in `lib/supabase/admin-server.ts`
behind `import 'server-only'`.

---

## 7. Local development

```
# one-time
npm install
npx supabase start                  # boots local Supabase
cp .env.example .env.local          # fill in local Supabase keys

# day-to-day
npm run dev                          # Next.js
npx supabase db reset                # rebuild local DB from migrations
npx supabase migration new <name>    # author a new migration
```

Local Supabase Studio is at `http://localhost:54323`. Use it to assign
roles and locations to test users.

To create a first admin locally:

1. Sign up in the app at `/login` (sign-up toggle is on in local).
2. In Studio, open `public.profiles`, set the new row's `role` to
   `founder_admin`.
3. In `public.user_location_assignments`, insert a row pointing to the
   `company_wide` location.

---

## 8. Production setup

One-time, performed by an admin:

1. Create the `swell-prod` Supabase project.
2. Apply migrations: `npx supabase db push` against the prod project.
3. Confirm RLS is on for every `public.*` table.
4. Disable public sign-up in Auth settings.
5. Create the founder's auth user via Supabase Studio.
6. In `public.profiles`, set their `role` to `founder_admin`.
7. In `public.user_location_assignments`, attach them to `company_wide`.
8. Set the env vars in Vercel (production scope only):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`
9. Deploy. The founder logs in and invites the rest of the team via
   `/admin/users`.

---

## 9. Backups and recovery

- Supabase nightly backups: enabled on staging and production.
- Migrations are the source of truth for schema; the prod database can
  be rebuilt from `supabase/migrations/` plus the seed.
- Storage is not in the nightly backup tier in V1; we mirror critical
  storage buckets (spec photos, BEO PDFs) to cold storage manually
  until we have a real DR plan. This is a known gap to address in
  Phase 12.

---

## 10. Open setup questions

- Email sending for password resets and admin invites: use Supabase's
  built-in mailer in V1, revisit a transactional provider (Resend /
  Postmark) before public launch.
- Branch databases per Vercel preview: out of scope for V1, but
  Supabase branching is a future fit.

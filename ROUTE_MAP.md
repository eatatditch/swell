# SWELL — Route Map

All app routes and what each page does. Phase 1 ships every route as a
shell. Feature work happens in later phases.

The app uses the **Next.js App Router**. Auth-protected routes live
under a `(app)` route group so the protected layout applies to them
all. Auth-only routes (`/login`) live under an `(auth)` route group
without the protected layout.

---

## Top-level

| Route | Phase | Purpose |
|---|---|---|
| `/` | 1 | Server-side redirect: authed → `/dashboard`, otherwise → `/login`. |
| `/login` | 1 | Email / password login. React Hook Form + Zod. |
| `/logout` | 1 | Server action endpoint that signs out and redirects to `/login`. |
| `/auth/callback` | 1 | Supabase auth callback for email-link / magic flows. |

---

## Dashboard

| Route | Phase | Purpose |
|---|---|---|
| `/dashboard` | 1 | Role-based landing. Cards: Today's Priorities, Open Issues, Needs Follow-Up, Training Progress (own), Recent Activity. |

---

## Founder View

| Route | Phase | Purpose |
|---|---|---|
| `/founder` | 11 | Founder weekly review. Strategic priorities, decision log, cash snapshot, company issues, accountability board. Admin-only. |

---

## Daily Ops

| Route | Phase | Purpose |
|---|---|---|
| `/daily-ops` | 1 / 3 | Module landing. Today's checklists, open issues, recent manager logs. |
| `/daily-ops/logs` | 3 | List + detail of manager logs and shift notes. |
| `/daily-ops/checklists` | 3 | Checklist templates (admin / GM) and today's runs. |
| `/daily-ops/issues` | 3 | Maintenance, 86'd items, staff notes, comp / void log. |

---

## Kitchen

| Route | Phase | Purpose |
|---|---|---|
| `/kitchen` | 1 / 6 | Module landing. Today's prep, line check status, recent waste. |
| `/kitchen/prep` | 6 | Prep lists, par levels, ordering notes. |
| `/kitchen/line-checks` | 6 | Today's line checks, history. |
| `/kitchen/waste` | 6 | Waste log entry + history. |

---

## Surf School (Training)

| Route | Phase | Purpose |
|---|---|---|
| `/training` | 1 / 4 | Module landing. Your courses, progress, sign-offs needed. |
| `/training/courses` | 4 | All courses, filtered by role / department. |
| `/training/lessons` | 4 | Lesson player route (`/training/lessons/:id`). |
| `/training/progress` | 4 | Progress matrix (admin / GM). |

---

## Specs & Menus

| Route | Phase | Purpose |
|---|---|---|
| `/specs` | 1 / 5 | Module landing. Recently updated specs, status overview. |
| `/specs/food` | 5 | Food specs list + detail. |
| `/specs/cocktails` | 5 | Cocktail specs list + detail. |
| `/specs/menu-items` | 5 | Menu items, status, season, allergens. |

---

## Catering & Events

| Route | Phase | Purpose |
|---|---|---|
| `/catering` | 1 / 7 | Module landing. Pipeline value, upcoming events, follow-ups. |
| `/catering/leads` | 7 | Lead pipeline (kanban + table). |
| `/catering/events` | 7 | Booked events, BEO detail. |
| `/catering/calendar` | 7 | Calendar view of events. |

---

## Marketing

| Route | Phase | Purpose |
|---|---|---|
| `/marketing` | 1 / 8 | Module landing. Campaigns in motion, approvals needed. |
| `/marketing/campaigns` | 8 | Campaign list + detail, approval workflow. |
| `/marketing/content-calendar` | 8 | Content calendar view. |
| `/marketing/shot-lists` | 8 | Shot lists for upcoming shoots. |

---

## Guest Experience

| Route | Phase | Purpose |
|---|---|---|
| `/guest-experience` | 1 / 9 | Module landing. Recent recoveries, VIPs in-house, review queue. |
| `/guest-experience/guests` | 9 | Guest profiles (search, VIPs, preferences). |
| `/guest-experience/recovery` | 9 | Recovery log + status. |
| `/guest-experience/reviews` | 9 | Review tracking + response status. |

---

## Scoreboard

| Route | Phase | Purpose |
|---|---|---|
| `/scoreboard` | 1 / 10 | KPIs (sales, labor, COGS, prime cost, check avg), weekly recap, manager scorecard, Recharts. |

---

## Admin

| Route | Phase | Purpose |
|---|---|---|
| `/admin` | 1 | Admin landing. Tabs route to the sub-pages below. |
| `/admin/users` | 1 / 12 | User list, invites, role and location assignment. |
| `/admin/roles` | 1 / 12 | Role configuration view (read-only in V1; matrix view of `ROLE_PERMISSIONS.md`). |
| `/admin/locations` | 1 / 12 | Locations list + edit. |
| `/admin/settings` | 1 / 12 | System settings (brand, hours, single-row config). |

---

## Patterns

- **Module landing pages** (`/<module>`) show recent activity, today's
  ownership, and quick entry. They are the "home" of the module.
- **List routes** end in the resource's plural noun (`/leads`,
  `/events`, `/courses`).
- **Detail routes** use `:id` and live under the list (`/specs/food/:id`).
- **Form routes** are dialog-first; we add explicit `/new` and `/:id/edit`
  routes only when a form is too big for a dialog.
- **Server actions** live next to the page that owns them; they are not
  exposed as REST routes.

## Middleware

`middleware.ts` runs on every `(app)` route. It:

1. Reads the Supabase session cookie via `@supabase/ssr`.
2. Redirects to `/login?next=<requested>` if no session.
3. Refreshes the session if expired.
4. Reads the user's `profiles.role` once per request.
5. Blocks `/admin/*` for non-admins (server-side redirect).

Admin-only pages also assert role inside their server component as a
defense in depth.

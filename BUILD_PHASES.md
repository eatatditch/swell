# SWELL — Build Phases

SWELL ships in phases. Each phase is a small, demoable slice. We do not
start a phase until the previous phase is in production and a real
manager has used it on a real shift.

Each phase below lists:

- **Goal** — what this phase makes possible.
- **Features** — user-visible scope.
- **Database** — migrations or schema changes.
- **Pages / routes** — what gets wired up.
- **Components** — what gets built or extended.
- **QA checklist** — what we test before calling it done.
- **Done criteria** — the binary check.

---

## Phase 1 — Foundation

**Goal.** A real user can sign up, an admin assigns them a role and a
location, they log in and see only the modules and locations they
should. Every module page exists as an empty shell.

**Features.**
- Email / password auth (Supabase).
- Login, logout, session persistence via cookies.
- Protected app shell.
- Sidebar navigation with role-based visibility.
- Location switcher in the topbar.
- One empty page per module.
- Admin shell with Users / Roles / Locations / Settings tabs.

**Database.**
- `0001_initial_schema.sql`: `locations`, `profiles`,
  `user_location_assignments`, `departments`, helpers, RLS, signup
  trigger, seed locations + departments.

**Pages / routes.**
- `/login`
- `/dashboard`
- `/founder`
- `/daily-ops`, `/kitchen`, `/training`, `/specs`, `/catering`,
  `/marketing`, `/guest-experience`, `/scoreboard`
- `/admin`, `/admin/users`, `/admin/roles`, `/admin/locations`,
  `/admin/settings`

**Components.**
- `AppShell`, `Sidebar`, `Topbar`, `UserMenu`, `LocationSwitcher`,
  `PageHeader`, `EmptyState`, `LoginForm`, shadcn primitives.

**QA.**
- Unauthed `/dashboard` redirects to `/login`.
- After login, the sidebar shows only modules the role can see.
- Non-admins hitting `/admin` are redirected.
- Location switcher lists only the user's locations.
- Signup creates a `profiles` row with `role = 'team_member'`.

**Done.** A new user can be invited, assigned, log in, and navigate the
empty shell. Lighthouse pass on `/login` and `/dashboard`. RLS verified
with a non-admin test account.

---

## Phase 2 — Shared System Objects

**Goal.** The primitives every module will reuse exist once.

**Features.**
- Tasks, comments, attachments, activity log, notifications,
  categories, statuses, priorities, due dates.
- Generic UI for these primitives that modules embed.

**Database.**
- `0002_shared_objects.sql`: `tasks`, `comments`, `attachments`,
  `activity_log`, `notifications`, `categories`, RLS, `log_activity`
  trigger helpers.
- Storage buckets created.

**Pages.** None new. Touches admin (categories editor).

**Components.**
- `TaskList`, `TaskCard`, `TaskFormDialog`
- `CommentThread`, `CommentComposer`
- `AttachmentList`, `AttachmentUploader`
- `ActivityFeed`
- `NotificationBell`, `NotificationList`
- `StatusBadge`, `PriorityBadge`, `DueDateBadge`

**QA.**
- Task assignment notifies recipient.
- Comments / attachments scoped by RLS on the parent row.
- Activity log records create / update / complete.
- Storage policies enforce auth.

**Done.** Another module can wire in tasks / comments / attachments in
under an hour.

---

## Phase 3 — Daily Ops

**Goal.** Managers run their shift from SWELL.

**Features.**
- Checklist templates (opening, closing, pre-shift, cleaning).
- Daily checklist runs per location.
- Manager log per shift.
- Shift handoff notes.
- 86'd items, maintenance issues, guest incidents intake, staff notes,
  pre-shift topics, comp / void notes.
- Today's view on Dashboard.

**Database.** `0003_daily_ops.sql` — checklist tables, manager_logs,
shift_notes, eighty_sixed_items, maintenance_issues, guest_incidents
(stub for Phase 9), comp_void_notes.

**Pages.** `/daily-ops`, `/daily-ops/logs`, `/daily-ops/checklists`,
`/daily-ops/issues`.

**Components.** `ChecklistRunner`, `ChecklistTemplateEditor`,
`ManagerLogComposer`, `ShiftHandoffPanel`, `EightySixedList`,
`IssueList`.

**QA.** A GM can build a template, a service manager can complete it on
a phone, the next shift sees the handoff.

**Done.** One full opening-to-closing day at one location captured in
SWELL.

---

## Phase 4 — Surf School (Training)

**Goal.** Every new hire can be enrolled in a role-based path and
managers can see who is behind.

**Features.** Categories, courses, lessons, video / resource embedding,
quizzes, employee progress, manager sign-offs, role-based paths,
certifications with expiration.

**Database.** `0004_training.sql`.

**Pages.** `/training`, `/training/courses`, `/training/lessons`,
`/training/progress`.

**Components.** `CoursePlayer`, `LessonViewer`, `QuizRunner`,
`ProgressMatrix`, `SignoffPanel`, `CertificationList`.

**QA.** A new hire enrolled in the FOH path can finish lesson 1, take
the quiz, and a manager can sign them off. Certifications nearing
expiration surface on the dashboard.

**Done.** A real new hire onboarded entirely through SWELL.

---

## Phase 5 — Specs & Menus

**Goal.** Single source of truth for every menu item and spec.

**Features.** Food specs, cocktail specs, build sheets, garnishes,
photos, allergens, cost notes, plating standards, menu item status,
seasonal specials, version history.

**Database.** `0005_specs_menus.sql`.

**Pages.** `/specs`, `/specs/food`, `/specs/cocktails`,
`/specs/menu-items`.

**Components.** `SpecCard`, `SpecDetail`, `SpecEditor`,
`AllergenMatrix`, `MenuItemStatusBadge`, `VersionHistoryDrawer`,
`PhotoGallery`.

**QA.** Chef can publish a new spec, line cook sees it on their phone,
allergens are filterable.

**Done.** Print binders retired at one location.

---

## Phase 6 — Kitchen

**Goal.** BOH runs from SWELL.

**Features.** Prep lists, par levels, ordering notes, waste logs, line
checks, cleaning checklists, vendor issues, equipment issues, kitchen
shift notes.

**Database.** `0006_kitchen.sql`.

**Pages.** `/kitchen`, `/kitchen/prep`, `/kitchen/line-checks`,
`/kitchen/waste`.

**Components.** `PrepListRunner`, `ParLevelEditor`, `WasteLogger`,
`LineCheckRunner`, `VendorIssueList`, `EquipmentIssueList`.

**QA.** Sous chef can complete a prep list on a phone in the walk-in;
waste is logged in under 30 seconds.

**Done.** One week of full kitchen execution at one location.

---

## Phase 7 — Catering & Events

**Goal.** Catering pipeline and BEOs run from SWELL.

**Features.** Lead capture, pipeline (kanban), contact notes,
follow-up reminders, BEO-style event sheets, deposits / payment
status, UGC opportunities, post-event review tracking, status stages.

**Database.** `0007_catering.sql`.

**Pages.** `/catering`, `/catering/leads`, `/catering/events`,
`/catering/calendar`.

**Components.** `LeadPipeline`, `LeadDetail`, `BEOEditor`,
`PaymentStatus`, `FollowupList`, `EventCalendar`.

**QA.** Catering manager can take a lead from inquiry → booked →
post-event review without leaving SWELL.

**Done.** One real event run end-to-end in SWELL.

---

## Phase 8 — Marketing

**Goal.** Marketing planning lives in one place.

**Features.** Campaign calendar, content calendar, creative briefs,
shot lists, ad requests, email / SMS planning, influencer / UGC
tracker, approval workflow, performance notes.

**Database.** `0008_marketing.sql`.

**Pages.** `/marketing`, `/marketing/campaigns`,
`/marketing/content-calendar`, `/marketing/shot-lists`.

**Components.** `CampaignBoard`, `ContentCalendar`, `BriefEditor`,
`ShotList`, `AdRequestForm`, `ApprovalChip`, `UGCList`.

**QA.** A campaign can be planned, briefed, shot, approved, scheduled,
and reviewed in SWELL.

**Done.** Next month's marketing plan lives entirely in SWELL.

---

## Phase 9 — Guest Experience

**Goal.** Guest recovery and VIP knowledge stops living in DMs.

**Features.** Guest profiles, VIP notes, recovery logs, comp history,
review response tracking, surprise-and-delight, Surf Club
opportunities, key preferences.

**Database.** `0009_guest_experience.sql`.

**Pages.** `/guest-experience`, `/guest-experience/guests`,
`/guest-experience/recovery`, `/guest-experience/reviews`.

**Components.** `GuestProfile`, `RecoveryTimeline`, `ReviewTracker`,
`VIPBadge`, `PreferenceList`.

**QA.** Service manager can log a recovery, the founder can search a
guest by name and see the full history.

**Done.** Every recovery in a sample week captured in SWELL.

---

## Phase 10 — Scoreboard

**Goal.** Weekly numbers live in SWELL.

**Features.** Daily KPI entry per location (sales, labor, COGS, prime
cost, check average), catering pipeline value rollup, weekly recap,
manager accountability scorecard, Recharts dashboards.

**Database.** `0010_scoreboard.sql`.

**Pages.** `/scoreboard`.

**Components.** `KPICard`, `TrendChart` (Recharts), `WeeklyRecap`,
`ManagerScorecard`, `KPIEntryForm`.

**QA.** GM can enter yesterday's numbers in under two minutes; founder
sees the company-wide rollup.

**Done.** Four consecutive weeks of recaps captured in SWELL.

---

## Phase 11 — Founder View

**Goal.** The founder runs the weekly business review out of SWELL.

**Features.** Strategic priorities, delegation, decision logs, cash
snapshots (manual entry), company-wide open issues feed, accountability,
performance roll-up sourced from other modules.

**Database.** `0011_founder.sql`.

**Pages.** `/founder`.

**Components.** `PriorityList`, `DecisionLog`, `CashSnapshotEditor`,
`CompanyIssueFeed`, `AccountabilityBoard`.

**QA.** A weekly review can be run from `/founder` with no other tab
open.

**Done.** Founder's weekly review meeting uses SWELL as its only doc.

---

## Phase 12 — Polish, QA, Production Readiness

**Goal.** SWELL is launchable to the full team.

**Features.**
- Error, empty, and loading states across every page.
- Mobile responsiveness pass on every page (manager-on-phone test).
- Zod validation on every form.
- RLS audit — table by table, role by role.
- Permission tests — one e2e per role.
- Deployment checklist for Vercel.
- Seed data scripts (locations, departments, sample categories).
- Internal docs: how to invite users, how to add a location, how to
  back up.

**Database.** No new tables. Possibly indexes added based on real
usage.

**Done.** A new team member can be invited, log in, finish onboarding,
and complete a shift without help from a developer.

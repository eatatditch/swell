# SWELL — Product Blueprint

**SWELL** = Systems, Workflow, Execution, Leadership, Learning.

SWELL is the internal operating system for **Ditch**, a surf / coastal
restaurant brand with locations in **Bay Shore**, **Port Jefferson**, and
a planned **Kings Park**. It replaces the patchwork of spreadsheets,
group chats, paper checklists, and shared drives that Ditch leadership
uses today and becomes the single source of truth for daily ops,
kitchen, training, catering, marketing, guest experience, specs, and
performance.

This is not a generic task app. It is a restaurant operating system.

## Product North Star

SWELL should feel like one calm, clear place where every Ditch leader
can answer, in under a minute:

1. **What matters today?**
2. **What needs to get done?**
3. **What standard applies?**
4. **Who owns this?**
5. **What needs attention?**
6. **What changed?**
7. **What should I learn next?**

If a screen does not help answer one of those seven questions, it does
not belong in V1.

## Brand & Tone

- Clean. Coastal. Operationally serious.
- Not corporate. Not cheesy. Not gimmicky.
- Modern but practical.
- Ditch / Swell energy without being overly cute.
- Restaurant-operator language. "Open Issues", "Today's Priorities",
  "Needs Follow-Up", "Shift Handoff", "Manager Log", "Guest Recovery",
  "Prep Status", "Training Progress", "Campaigns in Motion",
  "Weekly Scoreboard". Never "synergize workflows".

## Users (Roles)

| Role | Description |
|---|---|
| Founder / Admin | Full access across all locations and modules. Configures the system. |
| General Manager | Runs a single location end to end. Full operational access for that location. |
| Service Manager | Owns front-of-house at a location. Daily ops, guest experience, scoreboard. |
| Kitchen Manager / Chef | Owns back-of-house at a location. Kitchen, specs and menus, training for BOH. |
| Marketing Manager | Owns marketing across the company. Campaigns, content calendar, UGC. |
| Catering Manager | Owns catering and events across the company. |
| Team Member | Limited access. Sees their tasks, training, and the daily ops view for their location. |

A user has one primary role. Their role is scoped by one or more location
assignments. Founder / Admin always has company-wide access. Marketing and
Catering managers are typically company-wide.

## Locations

- Bay Shore *(open)*
- Port Jefferson *(open)*
- Kings Park *(planned)*
- Company-wide *(virtual scope used by founder, marketing, catering)*

Every operational row is tagged with a `location_id` when relevant.
Users see only data for the locations they are assigned to, unless they
are Founder / Admin or assigned to `company_wide`.

## Modules (V1)

There are **eleven** modules in V1. Phase 1 ships the shell of each.
Feature work happens in later phases.

1. **Dashboard** — role-based landing page. Today's priorities, alerts,
   reminders, recent updates, open issues, performance snapshot.
2. **Founder View** — Founder/CEO weekly review. Strategic priorities,
   delegation, decision logs, cash and performance snapshots,
   company-wide issues, accountability.
3. **Daily Ops** — opening / closing checklists, manager logs, shift
   notes, 86'd items, maintenance issues, guest incidents, staff notes,
   pre-shift topics, comp / void notes, location handoff.
4. **Kitchen** — prep lists, par levels, ordering notes, waste logs,
   line checks, cleaning checklists, vendor issues, equipment issues,
   kitchen shift notes.
5. **Surf School** (Training) — categories, courses, lessons,
   videos / resources, quizzes, employee progress, manager sign-offs,
   role-based training paths, certifications.
6. **Specs & Menus** — food specs, cocktail specs, build sheets,
   garnishes, photos, allergens, cost notes, plating standards, menu
   item status, seasonal specials, version history.
7. **Catering & Events** — lead capture, lead pipeline, contact notes,
   follow-up reminders, BEO-style event sheets, deposit / payment
   status, UGC opportunities, post-event review tracking, event status
   stages.
8. **Marketing** — campaign calendar, content calendar, creative
   briefs, shot lists, ad requests, email / SMS planning,
   influencer / UGC tracker, approval workflow, performance notes.
9. **Guest Experience** — guest profiles, VIP / regular notes,
   guest recovery logs, comp history, review response tracking,
   surprise-and-delight opportunities, Surf Club opportunities,
   important guest preferences.
10. **Scoreboard** — sales, labor, COGS, prime cost, check average,
    catering pipeline value, weekly location recap, manager accountability
    scorecard, charts and trends (Recharts).
11. **Admin** — users, roles, permissions, locations, system settings,
    categories, configuration.

## V1 Scope

V1 = Phases 1–12 in `BUILD_PHASES.md`.

- All eleven modules are present (shells in Phase 1, then phased feature
  work).
- Email / password auth via Supabase.
- Real database logic — no fake demo data shipped to production. Where
  a feature is not yet built, the empty state says so honestly.
- Restaurant-operator-friendly UI. Mobile-friendly. Strong empty,
  loading, and error states.
- Recharts dashboards on Scoreboard and Founder View.
- Storage for spec photos, training resources, marketing assets, event
  attachments.
- Audit log of admin-relevant actions.

## Out of Scope for V1

- AI features (summaries, copilots, generated drafts).
- Native mobile apps.
- Customer-facing accounts or public pages.
- Public catering booking widget.
- POS integrations (handled as manual entry in Scoreboard for V1).
- Payroll / scheduling integrations.

## Future AI Layer (designed for, not built)

V1 is shaped so an AI request layer can sit on top later. Future AI
might answer:

- "What needs attention today?"
- "Summarize yesterday's manager logs."
- "Create a prep list from this event."
- "Draft a guest recovery response."
- "Build a marketing campaign brief."
- "Show me who is behind on training."

To make that cheap to add later, V1:

- Stores structured data (no free-text-only blobs where a column will do).
- Tags every row with `created_by`, `location_id`, and `status`.
- Keeps an `activity_log` so an AI can ground answers in real events.
- Keeps tasks, comments, and attachments as first-class shared objects
  so an AI can read across modules without per-module integration.

## Design Principles

1. **Restaurant first, software second.** Optimize for a manager on a
   phone in the middle of a Friday dinner rush, not for a developer
   with two monitors.
2. **Real data only.** No fake demo content in production. Honest empty
   states.
3. **One way to do a thing.** No duplicate flows. Shared concepts live
   in shared tables (tasks, comments, attachments, activity log).
4. **Auditable.** Every operational table tracks `created_at`,
   `updated_at`, `created_by`, plus `location_id` and `status` where
   they apply.
5. **Boring stack, boring patterns.** Server components by default,
   client components only where state is needed. RLS everywhere.
6. **Clear ownership.** Every workflow has an obvious owner.

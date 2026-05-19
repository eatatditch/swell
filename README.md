# SWELL

**SWELL** = Systems, Workflow, Execution, Leadership, Learning.

Internal operating system for Ditch. Built on Next.js + Supabase.

## Planning docs

Read these first:

- [`PRODUCT_BLUEPRINT.md`](./PRODUCT_BLUEPRINT.md) — vision, modules, scope.
- [`DATABASE_SCHEMA_PLAN.md`](./DATABASE_SCHEMA_PLAN.md) — schema, RLS, storage.
- [`BUILD_PHASES.md`](./BUILD_PHASES.md) — phased build plan.
- [`ROLE_PERMISSIONS.md`](./ROLE_PERMISSIONS.md) — role × module matrix.
- [`ROUTE_MAP.md`](./ROUTE_MAP.md) — all app routes.
- [`COMPONENT_PLAN.md`](./COMPONENT_PLAN.md) — component catalog.
- [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) — Supabase configuration.

## Stack

Next.js · TypeScript · Supabase · Tailwind · shadcn/ui · React Hook Form · Zod · Recharts · Vercel.

## Local development

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# optional: run Supabase locally
npx supabase start
npx supabase db reset

npm run dev
```

App runs on http://localhost:3000.

## First admin

1. Sign up at `/login` (sign-up is on locally).
2. In Supabase Studio (http://localhost:54323), open `public.profiles` and set the new user's `role` to `founder_admin`.
3. In `public.user_location_assignments`, insert a row pointing to the `company_wide` location.
4. Reload — you should see all modules in the sidebar and access to `/admin`.

## Current status

Phase 1 — Foundation. Auth, role-based shell, location switcher, empty module pages, admin shell, and the initial database migration are in place. Module features are built in subsequent phases per `BUILD_PHASES.md`.

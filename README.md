# SWELL Project Instructions

We are building SWELL, the internal operating system for Ditch.

SWELL stands for:
Systems, Workflow, Execution, Leadership, Learning.

The goal is to create one unified internal web app for Ditch restaurant leadership.

Stack:
- Next.js
- Vercel
- Supabase
- Tailwind
- shadcn/ui
- React Hook Form
- Zod
- Recharts

Core users:
- Founder/Admin
- General Manager
- Service Manager
- Kitchen Manager/Chef
- Marketing Manager
- Catering Manager
- Team Member

Core locations:
- Bay Shore
- Port Jefferson
- Kings Park
- Company-wide

Core modules:
- Dashboard
- Daily Ops
- Kitchen
- Training
- Catering & Events
- Marketing
- Guest Experience
- Specs & Menus
- Scoreboard
- Admin

Rules:
- Build cleanly and modularly.
- Do not over-engineer.
- Do not create fake demo logic where real database logic is needed.
- Use Supabase for auth, database, and storage.
- Use role-based permissions.
- Every major table should include created_at, updated_at, created_by, location_id when relevant, and status when relevant.
- Every workflow should have clear ownership.
- Prioritize simple, usable restaurant operations over fancy tech.
- Do not build AI features until the core system works.

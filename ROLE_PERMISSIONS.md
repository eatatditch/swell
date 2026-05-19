# SWELL — Role Permissions

This is the source of truth for what each role can view, create, edit,
delete, approve, and administer. The Phase 1 sidebar visibility is
driven by this document. Module-level write permissions are enforced
in later phases by Supabase RLS and by server actions on the Next.js
side.

---

## 1. Roles

| Slug | Display | Typical scope |
|---|---|---|
| `founder_admin` | Founder / Admin | All locations, all modules. |
| `general_manager` | General Manager | One location, all operational modules for that location. |
| `service_manager` | Service Manager | One location, FOH. |
| `kitchen_manager` | Kitchen Manager / Chef | One location, BOH. |
| `marketing_manager` | Marketing Manager | Company-wide marketing. |
| `catering_manager` | Catering Manager | Company-wide catering. |
| `team_member` | Team Member | One location, limited. |

A user has exactly one role in V1. If we ever need multi-role, we
promote `role` to a `user_roles` join table without restructuring
routes.

## 2. Location scope

- `founder_admin` always has access to all locations.
- Other roles see only the locations in
  `user_location_assignments`.
- A user assigned to `company_wide` is treated as having access to
  every location. Marketing, Catering, and Founder are typically
  `company_wide`.
- The location switcher only lists locations the user can see.
  "All locations" appears only when the user can see more than one.

---

## 3. Module visibility matrix

Legend:
- ✅ view + write (scoped by location as applicable)
- ✏️ view + scoped write (limited subset, see notes)
- 👁 view only
- ❌ hidden

| Module | Founder / Admin | GM | Service Mgr | Kitchen Mgr | Marketing Mgr | Catering Mgr | Team Member |
|---|---|---|---|---|---|---|---|
| Dashboard          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Founder View       | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Daily Ops          | ✅ | ✅ | ✅ | ✅ FOH read, BOH write | ❌ | ❌ | 👁 |
| Kitchen            | ✅ | ✅ | 👁 | ✅ | ❌ | ❌ | 👁 BOH only |
| Surf School        | ✅ | ✅ | ✏️ FOH path | ✏️ BOH path | ❌ | ❌ | 👁 own |
| Specs & Menus      | ✅ | 👁 | 👁 | ✅ | 👁 | 👁 | 👁 |
| Catering & Events  | ✅ | 👁 | ❌ | 👁 | 👁 | ✅ | ❌ |
| Marketing          | ✅ | 👁 | ❌ | ❌ | ✅ | 👁 | ❌ |
| Guest Experience   | ✅ | ✅ | ✅ | 👁 | 👁 | ❌ | ❌ |
| Scoreboard         | ✅ | ✅ scope | 👁 scope | 👁 scope | 👁 company | 👁 company | ❌ |
| Admin              | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

"scope" = filtered to the user's assigned locations.
"company" = treated as `company_wide`.

---

## 4. Action permissions per role

### Founder / Admin

- **View:** everything in every module across every location.
- **Create:** anything.
- **Edit:** anything, including other users' content.
- **Delete:** anything. Hard delete is restricted to admin-only flows
  (audit log records it).
- **Approve:** all approval workflows (campaigns, sign-offs, BEOs).
- **Administer:** users, roles, location assignments, categories,
  storage buckets, system settings.

### General Manager

- **View:** everything for their assigned location(s); plus
  read-only on Specs & Menus, Catering, and Marketing.
- **Create:** Daily Ops, Kitchen, Training assignments, Guest
  Experience entries, Scoreboard entries.
- **Edit:** their location's operational content.
- **Delete:** their own drafts; archives anything else.
- **Approve:** training sign-offs, daily ops checklist completions,
  comp / void notes at their location.
- **Administer:** nothing outside their location's operational data.

### Service Manager (FOH)

- **View:** Daily Ops, Guest Experience, FOH-relevant Specs, their
  location's Scoreboard.
- **Create:** Manager logs, shift notes, guest incidents, 86'd items,
  comp / void notes, recoveries.
- **Edit:** their own logs / notes; current-shift checklist runs.
- **Delete:** their own drafts.
- **Approve:** none.

### Kitchen Manager / Chef

- **View:** Kitchen, BOH-relevant Daily Ops, Specs & Menus (write),
  their location's Scoreboard.
- **Create:** Prep lists, par levels, waste logs, line checks,
  vendor / equipment issues, kitchen shift notes, specs.
- **Edit:** their kitchen data; specs (with version history).
- **Delete:** their own drafts.
- **Approve:** BOH training sign-offs, spec versions.

### Marketing Manager

- **View:** Marketing (full), Catering (read for opportunities),
  Specs & Menus (read), Scoreboard (company), Guest Experience
  (read for UGC opportunities).
- **Create:** Campaigns, content items, briefs, shot lists, ad
  requests, UGC tracker entries.
- **Edit:** any marketing record.
- **Approve:** marketing approval workflow stages.

### Catering Manager

- **View:** Catering (full), Marketing (read), Specs & Menus (read),
  Scoreboard (company).
- **Create:** Leads, follow-ups, events (BEOs), payments, UGC
  opportunities, post-event review requests.
- **Edit:** any catering record.
- **Approve:** BEOs ready to send to client.

### Team Member

- **View:** Dashboard, Daily Ops (read for their location), their own
  training progress, Specs & Menus (read).
- **Create:** Their own training quiz attempts; comments on items
  assigned to them.
- **Edit:** Their own profile (name, phone, avatar).
- **Delete:** Their own draft comments.
- **Approve:** none.

---

## 5. Cross-cutting rules

- **Audit log.** Every admin action (role change, location change,
  user deactivation, hard delete) writes to `audit_log` regardless of
  role.
- **Created-by override.** A user can always read and edit a row they
  created, scoped by RLS. Archiving a row they created is allowed;
  hard-deleting is not, except by admin.
- **Assignment.** When a user is `assigned_to` a task or item, they
  gain read + status-update on that row even if their role would not
  normally see it.
- **Mentions.** Mentioning a user in a comment grants them read access
  to that comment's parent row.

---

## 6. Phase 1 enforcement

This first phase enforces:

- Authenticated access to the app shell (middleware).
- Sidebar item filtering based on `role` (the matrix above, visible
  vs hidden columns).
- Admin module accessible only to `founder_admin`; non-admin hits
  redirect to `/dashboard`.
- Location switcher shows only the user's locations.
- Profile self-edit only.

Write enforcement on module data is added per module in its phase.

---

## 7. Future considerations

- Multi-role users: covered by promoting `role` to a join table.
- Per-permission flags ("this team member can edit Daily Ops"):
  deferred until a real GM asks for one.
- Delegated admin (GM can manage their location's team members):
  considered for Phase 12.

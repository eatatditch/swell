# Phase 2 — Completion Notes

Shared system objects. The reusable primitives every future module will
embed. No module features were built in this phase; the goal was to make
modules cheap to build later.

## 1. What was built

- **Migration `0002_shared_objects.sql`** — six new tables, two storage
  buckets, complete RLS coverage, and policies on `storage.objects`.
- **TypeScript types** for every new table (`lib/types/database.ts`).
- **Server-side helpers** for activity logging and notifying users
  (`lib/server/activity.ts`, `lib/server/notifications.ts`).
- **Server actions** for each primitive's mutating paths
  (`components/<primitive>/actions.ts`).
- **UI components** — badges, task card / list / form dialog,
  comment thread + composer, attachment list + uploader, activity feed,
  notification bell + list (`components/badges/*`, `components/tasks/*`,
  `components/comments/*`, `components/attachments/*`,
  `components/activity/*`, `components/notifications/*`).
- **Topbar integration** — `NotificationBell` lives in the topbar with
  an unread count.
- **Dashboard integration** — the Dashboard now uses real Phase 2
  primitives: a "Your Tasks" panel pulls open tasks assigned to the
  signed-in user, "Recent Activity" pulls from `activity_log`, and the
  top-right action opens the `TaskFormDialog`.
- **Admin `Categories` tab** — read view of seeded categories grouped
  by module.

## 2. Database tables added

All in the `public` schema. Every table has RLS enabled with explicit
SELECT / INSERT / UPDATE / DELETE policies.

| Table | Purpose | Key columns |
|---|---|---|
| `tasks` | Generic actionable work, optionally linked to any row in any module. | `assigned_to`, `due_date`, `priority`, `status`, `source_type`, `source_id`, `completed_at` |
| `comments` | Polymorphic comments via `(parent_type, parent_id)`. | `body`, `edited_at` |
| `attachments` | Pointers into Supabase Storage, polymorphic parent. Immutable rows. | `bucket`, `path`, `filename`, `mime_type`, `size_bytes` |
| `activity_log` | Append-only event log. | `actor_id`, `verb`, `object_type`, `object_id`, `summary`, `metadata` (jsonb) |
| `notifications` | Per-user inbox. | `recipient_id`, `kind`, `title`, `body`, `link`, `read_at`, `source_type`, `source_id` |
| `categories` | Module-scoped taxonomy with optional hierarchy. | `slug`, `name`, `module`, `parent_id`, `sort_order` |

**Indexes worth highlighting:**

- `tasks_assigned_status_idx` — `(assigned_to, status)` for "My Tasks"
- `tasks_open_idx` — partial index `(status) where status not in
  ('done','archived')` for open-issue scans
- `comments_parent_idx` — `(parent_type, parent_id, created_at)`
- `attachments_parent_idx` — `(parent_type, parent_id)`
- `activity_object_idx` — `(object_type, object_id, created_at desc)`
- `notifications_recipient_unread_idx` — `(recipient_id, read_at,
  created_at desc)` — covers the unread-count query and the bell list

**Storage buckets:**

- `attachments` (private) — generic per-row file storage. Read/insert
  by any authenticated user; delete by owner or admin. Object paths
  are namespaced by `<parent_type>/<parent_id>/<timestamp>-<rand><ext>`.
- `avatars` (public) — profile avatars. Public read; insert/update
  only by the owning user (first path segment must be `auth.uid()`).

**Triggers:**

- `tasks_set_updated_at`, `comments_set_updated_at` — reuse the
  Phase 1 `set_updated_at()` function.
- `tasks_completed_at_trigger` — auto-stamps `completed_at` on status
  transitions in/out of `done`.

**Helpers used in RLS:**
`is_admin()`, `current_user_location_ids()`, `has_location_access()` —
all from Phase 1. We did not introduce new helpers.

## 3. Components added

### Badges (`components/badges/`)

- `StatusBadge` — colored pill keyed on `TaskStatus`.
- `PriorityBadge` — outlined pill keyed on `Priority`.
- `DueDateBadge` — friendly relative date with "overdue" / "today"
  emphasis.

### Tasks (`components/tasks/`)

- `TaskCard` — interactive row with status toggle, status/priority/due
  badges, and assignee chip.
- `ReadonlyTaskCard` — same visual without the toggle.
- `TaskList` — wraps `TaskCard` rows with an `EmptyState`.
- `TaskFormDialog` — `Dialog` + RHF + Zod. Accepts an optional
  `locationId` and an optional `source = { type, id }` to attach the
  new task to any module row.
- `actions.ts` — `createTask`, `updateTaskStatus`. Both log activity;
  `createTask` also fires a `task_assigned` notification.

### Comments (`components/comments/`)

- `CommentThread` — server component, fetches comments joined with
  author profile, renders the list, and (optionally) a composer.
- `CommentComposer` — client form. ⌘/Ctrl + Enter to post.
- `actions.ts` — `createComment` (logs activity with verb
  `commented`), `deleteComment`.

### Attachments (`components/attachments/`)

- `AttachmentList` — server component. Lists rows, generates signed
  URLs (or public URLs for the `avatars` bucket), and renders the
  uploader below.
- `AttachmentUploader` — client component. Uploads directly to Supabase
  Storage with the browser client, then calls the `recordAttachment`
  server action to insert the row.
- `actions.ts` — `recordAttachment`, `deleteAttachment` (best-effort
  cleans up the underlying object via the admin client).

### Activity (`components/activity/`)

- `ActivityFeed` — server component. Filters by `objectType`,
  `objectId`, and/or `locationId`. Renders a vertical list of
  human-readable rows with avatar + relative time.

### Notifications (`components/notifications/`)

- `NotificationBell` — popover trigger with unread badge.
- `NotificationList` — list view with "mark all read" and per-row
  navigation.
- `actions.ts` — `markNotificationRead`, `markAllNotificationsRead`.

### UI primitives added

- `components/ui/dialog.tsx` — Radix Dialog wrapper.
- `components/ui/popover.tsx` — Radix Popover wrapper.
- `components/ui/textarea.tsx` — styled textarea.

### Shared server helpers

- `lib/server/activity.ts` — `logActivity(...)`.
- `lib/server/notifications.ts` — `notify(...)` (uses the admin
  client; only callable from `server-only` modules).
- `lib/server/queries.ts` — `getRecentNotifications`, `getMyOpenTasks`.

### Constants

- `lib/constants/tasks.ts` — `TASK_STATUSES`, `PRIORITIES`, labels,
  and an `isOpenStatus` helper.

## 4. How future modules reuse these

Every shared object is **polymorphic** via a `(parent_type, parent_id)`
or `(source_type, source_id)` pair. Modules pick a string for their
table (e.g. `'manager_log'`, `'catering_lead'`, `'menu_item'`) and pass
it in alongside the row id.

### Embed a task on any row

```tsx
<TaskFormDialog
  locationId={managerLog.location_id}
  source={{ type: "manager_log", id: managerLog.id }}
  trigger={<Button size="sm">Create follow-up</Button>}
/>
```

To list the open tasks for a row:

```ts
const { data } = await supabase
  .from("tasks")
  .select("*")
  .eq("source_type", "manager_log")
  .eq("source_id", managerLog.id)
  .order("due_date", { ascending: true });
```

### Embed a comment thread on any row

```tsx
<CommentThread
  parentType="catering_lead"
  parentId={lead.id}
  locationId={lead.location_id}
/>
```

### Embed attachments on any row

```tsx
<AttachmentList
  parentType="spec"
  parentId={spec.id}
  locationId={spec.location_id}
  bucket="attachments"
/>
```

### Embed an activity feed scoped to a row or location

```tsx
<ActivityFeed objectType="manager_log" objectId={managerLog.id} />

<ActivityFeed locationId={activeLocationId} limit={20} />
```

### Log a custom event from a module's server action

```ts
import { logActivity } from "@/lib/server/activity";

await logActivity({
  verb: "signed_off",
  objectType: "training_assignment",
  objectId: assignment.id,
  summary: `Signed off ${course.name} for ${employee.full_name}`,
  locationId: assignment.location_id,
});
```

### Notify a user from a server action

```ts
import { notify } from "@/lib/server/notifications";

await notify({
  recipientId: lead.owner_id,
  kind: "catering_follow_up_due",
  title: "Catering follow-up is due",
  body: lead.title,
  link: `/catering/leads/${lead.id}`,
  sourceType: "catering_lead",
  sourceId: lead.id,
});
```

### Storage bucket pattern

Modules that need module-specific buckets (spec photos, training
resources, marketing assets, event attachments) can pass their own
`bucket` to `AttachmentList` and `AttachmentUploader`. Those buckets
get created in the migration that introduces the module.

## 5. How to test

### One-time setup

```bash
npx supabase start             # local stack
npx supabase db reset          # applies 0001 + 0002
npm run dev                    # http://localhost:3000
```

If you already ran Phase 1: just push `0002` with
`npx supabase db reset` (destructive locally) or
`npx supabase db push` against a remote project.

### Make yourself admin

1. Sign up at `/login`.
2. Open Supabase Studio, set your `profiles.role` to `founder_admin`.
3. Insert a `user_location_assignments` row pointing to `company_wide`.

### Smoke tests

1. **Create a task.** Dashboard → "New Task" → fill in → create.
   - Verify the task shows up under "Your Tasks" *if* you assigned it
     to yourself (the form leaves `assigned_to` null by default; this
     is intentional — Phase 2 doesn't ship the assignee picker yet).
   - Verify "Recent Activity" shows `you created task — <title>`.
2. **Toggle a task.** Click the round button on a task card. It marks
   as done; click again to reopen.
   - Verify activity records the transition.
   - Verify `tasks.completed_at` is stamped when done and cleared when
     reopened (Studio).
3. **Assign a task to another user.** Insert a task directly in Studio
   with `assigned_to = <other user>`. As the other user, the
   notification bell shows a `task_assigned` row.
4. **Notifications.** Click the bell, click a notification, verify
   `read_at` is set and the badge count drops.
5. **Comments.** Pick any task id (or any uuid). Hit a page that
   embeds `<CommentThread parentType="task" parentId={id} />`. Phase
   2 does not ship a per-task detail page, but you can verify the
   primitive in isolation by adding a test page or by composing one
   in your scratch branch.
6. **Attachments.** Same as above — `<AttachmentList>` is fully
   functional; you'll wire it into module detail pages in their
   respective phases.
7. **Activity feed.** The dashboard's "Recent Activity" pulls every
   row from `activity_log` you can see. Confirm the location filter
   limits scope when applied.
8. **RLS.** Sign in as a non-admin team member with no location
   assignments. Verify:
   - They cannot see tasks created by others in another location.
   - They can see tasks assigned to them regardless of location.
   - They cannot insert into `notifications` (RLS blocks it; only
     the service-role `notify()` helper can).
   - They cannot insert into `activity_log` with someone else's
     `actor_id` (the policy enforces `actor_id = auth.uid()`).

### Build check

```bash
npm run typecheck
npm run build
```

Both should pass.

## 6. Known issues / open items

1. **Assignee picker not in the task dialog yet.** `TaskFormDialog`
   creates tasks without an `assigned_to`. We need a `UserComboBox`
   primitive (Phase 2 leftover) that searches `profiles` filtered to
   the active location's roster. Once that exists, the dialog picks
   it up and the notification path lights up.

2. **No "My Tasks" page yet.** Tasks live on the Dashboard via
   `getMyOpenTasks` but there is no `/tasks` list view. Most use will
   come through embedding tasks in module detail pages, so a global
   list page is low priority — but worth adding in Phase 12 polish.

3. **Comment edits / deletes are server-action only.** The
   `CommentThread` UI does not yet render per-comment edit / delete
   actions. The actions exist (`deleteComment`); the UI hook-up is
   a small follow-up.

4. **Realtime is not wired.** Notifications and tasks refresh on
   navigation / revalidation. Live updates via Supabase Realtime are
   deliberately deferred — most managers reload pages frequently
   enough that we'd rather ship features than push every keystroke.
   Easy to add later: `supabase.channel(...).on('postgres_changes',
   ...)` from the browser client.

5. **Storage cleanup is best-effort.** `deleteAttachment` removes the
   DB row, then asks Supabase Storage to remove the underlying object
   via the admin client. If storage fails, the row is gone but the
   object lingers as cold storage cost. Acceptable for V1; add a
   nightly orphan-sweeper if it becomes meaningful.

6. **Activity log writes from server actions, not triggers.** The
   schema doc reflects this — we chose explicit server-side logging
   because triggers can't always tell `update` from `complete` from
   `archive` without ugly conditionals. The trade-off: if a future
   path mutates a table outside a server action, it won't show up in
   the feed. We accept this for now and revisit if needed.

7. **Attachment uploads are single-file.** `AttachmentUploader`
   handles one file per click. Multi-file drag-and-drop is a polish
   item.

8. **Notification grouping.** Multiple "task_assigned" events to the
   same recipient appear as separate rows. Coalescing
   ("3 tasks assigned today") is a future enhancement.

9. **`'use server'` file constraint.** `app/(app)/actions.ts` had to
   move its non-async export to `app/(app)/constants.ts` in Phase 1.
   Same constraint applies to every primitive's `actions.ts` —
   anything exported from one must be an async function. Worth noting
   for module authors copy-pasting these.

## Phase 2 exit criteria

- ✅ Migration applies cleanly with no errors.
- ✅ `npm run typecheck` passes.
- ✅ `npm run build` produces 44 routes.
- ✅ Dashboard renders with real Phase 2 data.
- ✅ Notification bell renders in the topbar.
- ✅ All Phase 1 routes still work.

Ready for **Phase 3 — Daily Ops** when you give the word.

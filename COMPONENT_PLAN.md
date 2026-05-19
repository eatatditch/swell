# SWELL — Component Plan

A short, opinionated catalog of the components SWELL needs. The goal:
modules reuse the same primitives so the app feels like one product,
and a new module can be wired up in a day.

We use **shadcn/ui** primitives as the base layer. SWELL components
compose them. We do not hand-roll buttons, inputs, dialogs, etc.

Folder layout:

```
components/
  ui/               # shadcn primitives, generated
  layout/           # AppShell, Sidebar, Topbar, etc.
  data/             # DataTable, EmptyState, ActivityFeed, etc.
  forms/            # FormField, FileInput, DatePicker, ComboBox
  badges/           # StatusBadge, PriorityBadge, RoleBadge, DueDateBadge
  tasks/            # TaskList, TaskCard, TaskFormDialog
  comments/         # CommentThread, CommentComposer
  attachments/      # AttachmentList, AttachmentUploader
  notifications/    # NotificationBell, NotificationList
  charts/           # KPICard, TrendChart, StatBlock
  checklists/       # ChecklistRunner, ChecklistTemplateEditor
  calendar/         # MonthView, EventChip
  module/<module>/  # module-specific components
```

---

## 1. App shell

| Component | Purpose | Phase |
|---|---|---|
| `AppShell` | Wraps protected pages. Renders `Sidebar` + `Topbar` + `<main>`. | 1 |
| `Sidebar` | Module navigation. Filters items by role from `ROLE_PERMISSIONS.md`. Collapses on mobile to a sheet. | 1 |
| `SidebarItem` | One nav row. Active state, icon (lucide), label. | 1 |
| `Topbar` | Top bar with `LocationSwitcher`, `NotificationBell`, `UserMenu`. | 1 |
| `LocationSwitcher` | Dropdown of the user's locations + "All locations" when applicable. Persists to a cookie. | 1 |
| `UserMenu` | Avatar dropdown. Profile, sign out. | 1 |
| `PageHeader` | Title, optional subtitle, breadcrumbs, action slot. Used on every page. | 1 |
| `Container` | Width-capped page container. | 1 |
| `MobileNav` | Sheet-based sidebar for narrow viewports. | 1 |

---

## 2. State components

| Component | Purpose |
|---|---|
| `EmptyState` | Icon + title + body + optional CTA. Used wherever a list is empty. |
| `LoadingState` | Skeleton-based loader. Module landings use it during data fetch. |
| `ErrorState` | Friendly error block with retry. |
| `PermissionDenied` | Shown when a non-admin lands on an admin route through a stale link. |

---

## 3. Data display

| Component | Purpose | Notes |
|---|---|---|
| `DataTable` | Reusable table. Built on shadcn `Table`. Supports search, column filters, sort, sticky header. | Used by lists in every module. |
| `Card` | shadcn primitive. Used heavily on dashboards. | |
| `KPICard` | Card variant with label, big number, delta, sparkline slot. | Scoreboard, Founder. |
| `StatBlock` | Inline label + value + delta. | Dashboard cards. |
| `ActivityFeed` | Renders `activity_log` rows grouped by day. | Module landings. |
| `Timeline` | Vertical timeline for guest recoveries, decision logs. | |

---

## 4. Forms

We standardize on **React Hook Form + Zod**. Every form uses:

- `Form` (shadcn) wrapper
- `FormField`, `FormLabel`, `FormControl`, `FormMessage`
- Schema lives next to the form: `schema.ts` per form

Reusable inputs:

| Component | Purpose |
|---|---|
| `TextField` | Standard text input. |
| `TextArea` | Multi-line input. |
| `NumberField` | Numeric input. Formats currency / percent when configured. |
| `DatePicker` | Date / time picker. Built on shadcn `Calendar` + popover. |
| `ComboBox` | Async-searchable select (guests, users, menu items). |
| `Select` | Static select. |
| `RoleSelect` | Select scoped to the role enum. |
| `LocationSelect` | Select scoped to the user's locations. |
| `StatusSelect` | Status enum select. |
| `PrioritySelect` | Priority enum select. |
| `FileInput` | Drag-and-drop upload. Wraps Supabase Storage. |
| `Switch` | shadcn primitive. |
| `Checkbox` | shadcn primitive. |
| `RadioGroup` | shadcn primitive. |

---

## 5. Badges

| Component | Purpose |
|---|---|
| `StatusBadge` | Colored pill for `status` values. Color map by status. |
| `PriorityBadge` | Colored pill for `priority`. |
| `RoleBadge` | Role pill (admin, GM, etc.). |
| `LocationBadge` | Location pill. |
| `DueDateBadge` | Today / overdue / upcoming styling. |
| `ApprovalBadge` | Approval workflow stage. |

---

## 6. Shared system objects (Phase 2)

| Component | Purpose |
|---|---|
| `TaskList` | List of `tasks`. Filter by status, assignee, due. |
| `TaskCard` | Single task in a list / kanban. |
| `TaskFormDialog` | Create / edit task. |
| `CommentThread` | Comments on a parent row. Realtime if cheap. |
| `CommentComposer` | Markdown-light composer with mention support. |
| `AttachmentList` | Thumbnails / file rows. |
| `AttachmentUploader` | Drop / browse, progress, error states. |
| `ActivityFeed` | (See above.) |
| `NotificationBell` | Topbar bell with unread count. |
| `NotificationList` | Dropdown / page of notifications. |

---

## 7. Module-specific (sketch)

### Daily Ops

`ChecklistRunner`, `ChecklistTemplateEditor`, `ManagerLogComposer`,
`ShiftHandoffPanel`, `EightySixedList`, `IssueList`.

### Kitchen

`PrepListRunner`, `ParLevelEditor`, `WasteLogger`, `LineCheckRunner`,
`VendorIssueList`, `EquipmentIssueList`.

### Surf School

`CoursePlayer`, `LessonViewer`, `QuizRunner`, `ProgressMatrix`,
`SignoffPanel`, `CertificationList`.

### Specs & Menus

`SpecCard`, `SpecDetail`, `SpecEditor`, `AllergenMatrix`,
`VersionHistoryDrawer`, `PhotoGallery`.

### Catering & Events

`LeadPipeline` (kanban), `LeadDetail`, `BEOEditor`, `PaymentStatus`,
`FollowupList`, `EventCalendar`.

### Marketing

`CampaignBoard`, `ContentCalendar`, `BriefEditor`, `ShotList`,
`AdRequestForm`, `UGCList`.

### Guest Experience

`GuestProfile`, `RecoveryTimeline`, `ReviewTracker`, `VIPBadge`,
`PreferenceList`.

### Scoreboard

`KPICard` (above), `TrendChart` (Recharts), `WeeklyRecap`,
`ManagerScorecard`, `KPIEntryForm`.

### Founder View

`PriorityList`, `DecisionLog`, `CashSnapshotEditor`,
`CompanyIssueFeed`, `AccountabilityBoard`.

### Admin

`UserTable`, `InviteUserDialog`, `LocationTable`, `LocationEditDialog`,
`SettingsForm`, `AuditLogTable`.

---

## 8. Conventions

- **Server components by default.** Mark a file `'use client'` only
  when it needs state, effects, or browser APIs.
- **No prop drilling for the current user.** A `useCurrentUser()` hook
  reads from a React context populated by the protected layout.
- **No global state library.** Server components fetch, client components
  use `useState` / `useFormState`. Add Zustand only if a real need
  appears.
- **Variants via `class-variance-authority`.** Color / size variants on
  badges and buttons live in `cva` definitions, not inline conditionals.
- **Icons via `lucide-react`.** No mixing of icon libraries.
- **Accessibility.** Every interactive element is keyboard reachable.
  shadcn primitives give us this for free; we don't undo it.
- **Mobile first.** Every page is tested at 375px width before merge.

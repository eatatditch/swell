// Hand-written types for the Phase 1 schema. When the schema grows past
// what's practical to maintain by hand, we'll generate this with
// `supabase gen types typescript`.

export type Role =
  | "founder_admin"
  | "general_manager"
  | "service_manager"
  | "kitchen_manager"
  | "marketing_manager"
  | "catering_manager"
  | "team_member";

export type LocationSlug =
  | "bay_shore"
  | "port_jefferson"
  | "kings_park"
  | "company_wide";

export interface Location {
  id: string;
  slug: LocationSlug;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocationAssignment {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Phase 2 — shared system objects
// ---------------------------------------------------------------------------

export type TaskStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";

export type Priority = "low" | "normal" | "high" | "urgent";

export interface Task {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string | null;
  status: TaskStatus;
  priority: Priority;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  source_type: string | null;
  source_id: string | null;
  completed_at: string | null;
}

export interface Comment {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  parent_type: string;
  parent_id: string;
  body: string;
  edited_at: string | null;
}

export interface Attachment {
  id: string;
  created_at: string;
  created_by: string | null;
  parent_type: string;
  parent_id: string;
  bucket: string;
  path: string;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
}

export interface ActivityLogEntry {
  id: string;
  created_at: string;
  actor_id: string | null;
  location_id: string | null;
  verb: string;
  object_type: string;
  object_id: string;
  summary: string | null;
  metadata: Record<string, unknown>;
}

export interface Notification {
  id: string;
  created_at: string;
  recipient_id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  source_type: string | null;
  source_id: string | null;
}

export interface Category {
  id: string;
  created_at: string;
  slug: string;
  name: string;
  module: string;
  parent_id: string | null;
  sort_order: number;
}

/** A profile reference often joined onto comments, tasks, activity. */
export interface ProfileLite {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

// ---------------------------------------------------------------------------
// Phase 3 — daily ops
// ---------------------------------------------------------------------------

export type ChecklistKind = "opening" | "closing" | "pre_shift" | "cleaning";

export interface Checklist {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string | null;
  name: string;
  kind: ChecklistKind;
  description: string | null;
  is_active: boolean;
}

export interface ChecklistItem {
  id: string;
  created_at: string;
  updated_at: string;
  checklist_id: string;
  position: number;
  label: string;
  requires_note: boolean;
}

export type ChecklistCompletionStatus = "in_progress" | "completed";

export interface ChecklistCompletion {
  id: string;
  created_at: string;
  updated_at: string;
  checklist_id: string;
  location_id: string;
  run_date: string;
  status: ChecklistCompletionStatus;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
  created_by: string | null;
}

export interface ChecklistItemCompletion {
  id: string;
  created_at: string;
  updated_at: string;
  completion_id: string;
  item_id: string;
  checked: boolean;
  note: string | null;
  checked_by: string | null;
  checked_at: string | null;
}

export type Shift = "am" | "pm" | "all";
export type HandoffShift = "am" | "pm";

export interface ManagerLog {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  author_id: string | null;
  location_id: string;
  log_date: string;
  shift: Shift;
  // `body` is the legacy single-narrative column; new entries go in `notes`
  // and the column is preserved for backwards compatibility with existing data.
  body: string | null;
  sales_cents: number | null;
  guest_count: number | null;
  comps_cents: number | null;
  voids_cents: number | null;
  notes: string | null;
  checklist_completion_id: string | null;
}

export interface ShiftNote {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  author_id: string | null;
  location_id: string;
  note_date: string;
  from_shift: HandoffShift;
  to_shift: HandoffShift;
  body: string;
}

export interface EightySixedItem {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string;
  name: string;
  reason: string | null;
  until_at: string | null;
  resolved_at: string | null;
}

export type MaintenanceStatus = "open" | "in_progress" | "resolved";

export interface MaintenanceIssue {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string;
  title: string;
  description: string | null;
  status: MaintenanceStatus;
  priority: Priority;
  reported_by: string | null;
  assigned_to: string | null;
  resolved_at: string | null;
}

export type GuestIncidentSeverity = "low" | "normal" | "high" | "critical";
export type GuestIncidentStatus = "open" | "closed";

export interface GuestIncident {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string;
  summary: string;
  guest_name: string | null;
  occurred_at: string;
  severity: GuestIncidentSeverity;
  status: GuestIncidentStatus;
  reported_by: string | null;
}

export type CompVoidKind = "comp" | "void";

export interface CompVoidNote {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string;
  kind: CompVoidKind;
  amount_cents: number;
  reason: string;
  manager_id: string | null;
  ticket_ref: string | null;
  occurred_at: string;
}

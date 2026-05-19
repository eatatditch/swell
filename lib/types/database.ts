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

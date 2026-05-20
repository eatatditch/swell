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

// ---------------------------------------------------------------------------
// Phase 7 — catering & events
// ---------------------------------------------------------------------------

export interface CateringContact {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  source: string | null;
  tags: string[];
  notes: string | null;
}

export type CateringLeadStatus =
  | "lead"
  | "quote_sent"
  | "follow_up"
  | "booked"
  | "lost";

export interface CateringLead {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string | null;
  owner_id: string | null;
  contact_id: string;
  status: CateringLeadStatus;
  event_type: string | null;
  desired_date: string | null;
  party_size: number | null;
  budget_low_cents: number | null;
  budget_high_cents: number | null;
  estimated_value_cents: number | null;
  pipeline_position: number;
  source: string | null;
  notes: string | null;
  converted_event_id: string | null;
  lost_reason: string | null;
  closed_at: string | null;
}

export type CateringFollowupKind = "call" | "email" | "task";

export interface CateringFollowup {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  lead_id: string;
  assigned_to: string | null;
  kind: CateringFollowupKind;
  body: string;
  due_at: string | null;
  done_at: string | null;
}

export type CateringEventStatus =
  | "booked"
  | "confirmed"
  | "executed"
  | "canceled";

export type CateringServiceType =
  | "drop_off"
  | "buffet"
  | "plated"
  | "family_style"
  | "cocktail"
  | "food_truck"
  | "other";

export interface CateringEvent {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  owner_id: string | null;
  lead_id: string | null;
  contact_id: string | null;
  location_id: string;
  status: CateringEventStatus;
  service_type: CateringServiceType;
  title: string;
  event_date: string;
  start_time: string | null;
  end_time: string | null;
  guest_count: number | null;
  headcount_confirmed_at: string | null;
  venue: string | null;
  room: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  billing_name: string | null;
  billing_address: string | null;
  allergens_notes: string | null;
  special_requests: string | null;
  setup_notes: string | null;
  breakdown_notes: string | null;
  equipment_notes: string | null;
  staffing_notes: string | null;
  beverage_notes: string | null;
  internal_notes: string | null;
  total_quoted_cents: number;
  canceled_at: string | null;
  cancel_reason: string | null;
}

// ---------------------------------------------------------------------------
// Phase B — catering menu library (reusable menus → sections → items)
// ---------------------------------------------------------------------------

export interface CateringMenu {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string | null;
  name: string;
  description: string | null;
  default_service_type: CateringServiceType;
  is_archived: boolean;
  position: number;
}

export interface CateringMenuSection {
  id: string;
  created_at: string;
  updated_at: string;
  menu_id: string;
  position: number;
  name: string;
  description: string | null;
}

export interface CateringMenuSubsection {
  id: string;
  created_at: string;
  updated_at: string;
  section_id: string;
  position: number;
  name: string;
  description: string | null;
}

export interface CateringMenuItem {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  section_id: string;
  subsection_id: string | null;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  price_cents: number;
  min_quantity: number | null;
  allergens: string[];
  image_url: string | null;
  is_available: boolean;
}

export type ModifierSelectionKind = "single" | "multi";

export interface CateringMenuModifier {
  id: string;
  created_at: string;
  updated_at: string;
  item_id: string;
  position: number;
  name: string;
  selection_kind: ModifierSelectionKind;
  required: boolean;
  min_select: number;
  max_select: number | null;
}

export interface CateringMenuModifierOption {
  id: string;
  created_at: string;
  updated_at: string;
  modifier_id: string;
  position: number;
  name: string;
  price_delta_cents: number;
  is_default: boolean;
}

export type EventMenuCategory =
  | "food"
  | "beverage"
  | "rental"
  | "service"
  | "other";

export interface EventMenuItem {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  event_id: string;
  position: number;
  category: EventMenuCategory;
  name: string;
  description: string | null;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export type EventPaymentKind = "deposit" | "balance" | "refund" | "gratuity";
export type EventPaymentStatus = "pending" | "received" | "refunded" | "waived";
export type EventPaymentMethod = "cash" | "check" | "card" | "ach" | "other";

export interface EventPayment {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  event_id: string;
  invoice_id: string | null;
  recorded_by: string | null;
  kind: EventPaymentKind;
  status: EventPaymentStatus;
  method: EventPaymentMethod | null;
  amount_cents: number;
  due_at: string | null;
  paid_at: string | null;
  reference: string | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Phase C — catering quotes, invoices, billing
// ---------------------------------------------------------------------------

export type CateringQuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "declined"
  | "expired"
  | "converted";

export interface CateringQuote {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  contact_id: string;
  lead_id: string | null;
  event_id: string | null;
  location_id: string | null;
  quote_number: string;
  status: CateringQuoteStatus;
  title: string;
  event_date: string | null;
  guest_count: number | null;
  service_type: CateringServiceType | null;
  customer_notes: string | null;
  internal_notes: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  gratuity_rate_bps: number;
  gratuity_cents: number;
  total_cents: number;
  deposit_required_cents: number;
  valid_until: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  decline_reason: string | null;
  converted_invoice_id: string | null;
}

export interface CateringQuoteLineItem {
  id: string;
  created_at: string;
  updated_at: string;
  quote_id: string;
  menu_item_id: string | null;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export type CateringInvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void";

export interface CateringInvoice {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  contact_id: string;
  quote_id: string | null;
  event_id: string | null;
  location_id: string | null;
  invoice_number: string;
  status: CateringInvoiceStatus;
  title: string;
  issue_date: string;
  due_date: string | null;
  customer_notes: string | null;
  internal_notes: string | null;
  subtotal_cents: number;
  discount_cents: number;
  tax_rate_bps: number;
  tax_cents: number;
  gratuity_rate_bps: number;
  gratuity_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  balance_cents: number;
  sent_at: string | null;
  paid_at: string | null;
  voided_at: string | null;
  void_reason: string | null;
}

export interface CateringInvoiceLineItem {
  id: string;
  created_at: string;
  updated_at: string;
  invoice_id: string;
  menu_item_id: string | null;
  position: number;
  name: string;
  description: string | null;
  unit: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

export type EventUgcContentType =
  | "photos"
  | "reel"
  | "tag"
  | "feature"
  | "other";

export type EventUgcStatus = "planned" | "captured" | "posted" | "declined";

export interface EventUgcOpportunity {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  event_id: string;
  owner_id: string | null;
  contact_name: string | null;
  instagram_handle: string | null;
  content_type: EventUgcContentType;
  status: EventUgcStatus;
  planned_for: string | null;
  posted_link: string | null;
  notes: string | null;
}

export type ReviewPlatform =
  | "google"
  | "yelp"
  | "tripadvisor"
  | "opentable"
  | "other";

export interface EventReviewRequest {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  event_id: string;
  platform: ReviewPlatform;
  request_sent_at: string | null;
  response_received_at: string | null;
  rating: number | null;
  link: string | null;
  notes: string | null;
}

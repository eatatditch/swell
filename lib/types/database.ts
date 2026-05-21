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
  bio: string | null;
  job_title: string | null;
  start_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserNotificationPreferences {
  user_id: string;
  email_on_new_lead: boolean;
  email_on_quote_paid: boolean;
  email_on_comment: boolean;
  email_on_assignment: boolean;
  digest_daily: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserLocationAssignment {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

export interface SystemSettings {
  id: number;
  company_name: string | null;
  logo_url: string | null;
  primary_color: string | null;
  default_email_from_name: string | null;
  default_email_signature: string | null;
  default_reply_to: string | null;
  default_deposit_cents: number;
  assistant_kb: string | null;
  updated_at: string;
}

export interface LocationHours {
  id: string;
  location_id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
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
  source_form_id: string | null;
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
  accept_token: string | null;
  deposit_paid_at: string | null;
  deposit_payment_intent_id: string | null;
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

// ---------------------------------------------------------------------------
// Phase D — catering settings + Stripe Connect
// ---------------------------------------------------------------------------

export type StripeAccountStatus =
  | "not_connected"
  | "onboarding"
  | "active"
  | "restricted"
  | "disconnected";

export interface CateringSettings {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string | null;
  default_tax_rate_bps: number;
  default_gratuity_rate_bps: number;
  default_deposit_percent_bps: number;
  quote_terms: string | null;
  invoice_terms: string | null;
  reply_to_email: string | null;
  sender_name: string | null;
  stripe_account_id: string | null;
  stripe_account_status: StripeAccountStatus;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  stripe_connected_at: string | null;
  stripe_disconnected_at: string | null;
}

export type PaymentLinkStatus =
  | "pending"
  | "completed"
  | "expired"
  | "canceled"
  | "failed";

export interface CateringPaymentLink {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  invoice_id: string;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  stripe_account_id: string | null;
  amount_cents: number;
  currency: string;
  status: PaymentLinkStatus;
  url: string;
  expires_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
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

// ---------------------------------------------------------------------------
// Catering inquiry forms (Phase E)
// ---------------------------------------------------------------------------

export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "date"
  | "time"
  | "select"
  | "radio"
  | "checkbox_group"
  | "checkbox"
  | "hidden";

// Which catering_leads column a field's value should map into on submission.
export type LeadFieldMapping =
  | "event_type"
  | "desired_date"
  | "party_size"
  | "budget_low"
  | "budget_high"
  | "estimated_value"
  | "notes"
  | "source";

// Which catering_contacts column a field's value should map into.
export type ContactFieldMapping =
  | "full_name"
  | "email"
  | "phone"
  | "company";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  key: string;
  placeholder?: string;
  helpText?: string;
  defaultValue?: string;
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  options?: FormFieldOption[];
  leadField?: LeadFieldMapping | null;
  contactField?: ContactFieldMapping | null;
}

export interface FormRow {
  id: string;
  columns: 1 | 2 | 3;
  fields: FormField[];
}

export interface FormSchema {
  rows: FormRow[];
}

export interface FormSettings {
  submitLabel?: string;
  successMessage?: string;
  redirectUrl?: string;
  honeypotKey?: string;
  accentColor?: string;
}

export type FormSourceChannel =
  | "instagram"
  | "website"
  | "qr_code"
  | "ad"
  | "email"
  | "referral"
  | "partner"
  | "other";

export interface LeadForm {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  location_id: string;
  slug: string;
  name: string;
  description: string | null;
  schema: FormSchema;
  settings: FormSettings;
  active: boolean;
  submission_count: number;
  last_submission_at: string | null;
  source_channel: FormSourceChannel;
  source_label: string | null;
}

export interface LeadFormSubmission {
  id: string;
  created_at: string;
  form_id: string;
  lead_id: string | null;
  contact_id: string | null;
  payload: Record<string, unknown>;
  source_url: string | null;
  ip: string | null;
  user_agent: string | null;
}

// ---------------------------------------------------------------------------
// Gmail integration (Phase F)
// ---------------------------------------------------------------------------

export type GmailAccountStatus = "active" | "expired" | "revoked" | "error";

export interface GmailAccount {
  id: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  google_user_id: string;
  email: string;
  access_token_enc: string;
  refresh_token_enc: string;
  token_expires_at: string | null;
  scopes: string[];
  history_id: string | null;
  last_synced_at: string | null;
  status: GmailAccountStatus;
  last_error: string | null;
  watch_expires_at: string | null;
  watch_history_id: string | null;
}

// ---------------------------------------------------------------------------
// Phase 11 — founder view
// ---------------------------------------------------------------------------

export type FounderPriorityStatus =
  | "open"
  | "in_progress"
  | "blocked"
  | "done"
  | "archived";

export interface FounderPriority {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  title: string;
  description: string | null;
  owner_id: string | null;
  status: FounderPriorityStatus;
  priority: Priority;
  target_date: string | null;
  position: number;
  completed_at: string | null;
}

export interface DecisionLog {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  decided_on: string;
  title: string;
  context: string | null;
  decision: string;
  owner_id: string | null;
  follow_up: string | null;
  follow_up_due: string | null;
  follow_up_done_at: string | null;
}

export interface FounderCashSnapshot {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  snapshot_date: string;
  cash_on_hand_cents: number;
  payables_cents: number;
  receivables_cents: number;
  weekly_burn_cents: number | null;
  notes: string | null;
}

// ---------------------------------------------------------------------------
// Phase 4 — training (Surf School)
// ---------------------------------------------------------------------------

export interface TrainingCategory {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  slug: string;
  name: string;
  description: string | null;
  department: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export type TrainingStaffType = "foh" | "boh" | "management";

export interface TrainingStaff {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  full_name: string;
  staff_type: TrainingStaffType;
  email: string | null;
  phone: string | null;
  location_id: string | null;
  is_active: boolean;
  start_date: string | null;
  notes: string | null;
  linked_profile_id: string | null;
  last_seen_at: string | null;
}

export interface TrainingCourse {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  category_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  estimated_minutes: number | null;
  is_required: boolean;
  requires_signoff: boolean;
  sort_order: number;
  is_active: boolean;
  tags: string[];
  target_roles: Role[];
  applies_to_staff_types: TrainingStaffType[];
}

export interface TrainingLesson {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  course_id: string;
  slug: string;
  title: string;
  position: number;
  content: string | null;
  video_url: string | null;
  estimated_minutes: number | null;
  is_active: boolean;
}

export type TrainingResourceKind =
  | "video"
  | "pdf"
  | "image"
  | "link"
  | "download";

export interface TrainingLessonResource {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  lesson_id: string;
  kind: TrainingResourceKind;
  url: string;
  label: string | null;
  position: number;
  is_printable: boolean;
}

export interface TrainingQuiz {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  course_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string | null;
  passing_score: number;
  retry_limit: number;
  is_active: boolean;
}

export type TrainingQuestionKind =
  | "multiple_choice"
  | "true_false"
  | "short_answer";

export interface TrainingQuizQuestion {
  id: string;
  created_at: string;
  updated_at: string;
  quiz_id: string;
  position: number;
  kind: TrainingQuestionKind;
  prompt: string;
  explanation: string | null;
  correct_text: string | null;
}

export interface TrainingQuizOption {
  id: string;
  created_at: string;
  updated_at: string;
  question_id: string;
  label: string;
  is_correct: boolean;
  position: number;
}

export interface TrainingQuizAttempt {
  id: string;
  created_at: string;
  quiz_id: string;
  staff_id: string;
  score: number;
  passed: boolean;
  answers: Record<string, string>;
  started_at: string;
  completed_at: string;
}

export interface TrainingPath {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  description: string | null;
  target_roles: Role[];
  target_department: string | null;
  target_staff_types: TrainingStaffType[];
  course_interval_days: number;
  is_active: boolean;
  sort_order: number;
}

export interface TrainingPathCourse {
  id: string;
  created_at: string;
  updated_at: string;
  path_id: string;
  course_id: string;
  position: number;
  is_required: boolean;
}

export type StaffTrainingPathReason = "role" | "manual";

export interface StaffTrainingPath {
  id: string;
  created_at: string;
  updated_at: string;
  staff_id: string;
  path_id: string;
  assigned_by: string | null;
  assigned_reason: StaffTrainingPathReason;
  due_date: string | null;
  completed_at: string | null;
}

export interface TrainingProgress {
  id: string;
  created_at: string;
  updated_at: string;
  staff_id: string;
  lesson_id: string;
  completed_at: string;
  time_spent_seconds: number | null;
}

export interface TrainingSignoff {
  id: string;
  created_at: string;
  updated_at: string;
  staff_id: string;
  course_id: string;
  signed_by: string;
  signed_at: string;
  notes: string | null;
}

export interface TrainingAnnouncement {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  title: string;
  body: string | null;
  pinned: boolean;
  expires_at: string | null;
  course_id: string | null;
  path_id: string | null;
}

export interface Certification {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  staff_id: string;
  kind: string;
  name: string;
  issuing_body: string | null;
  issued_on: string;
  expires_on: string | null;
  document_url: string | null;
  notes: string | null;
}

export type EmailDirection = "inbound" | "outbound";

export interface EmailMessage {
  id: string;
  created_at: string;
  account_id: string;
  google_message_id: string;
  thread_id: string;
  direction: EmailDirection;
  from_email: string | null;
  from_name: string | null;
  to_emails: string[];
  cc_emails: string[];
  bcc_emails: string[];
  subject: string | null;
  snippet: string | null;
  body_text: string | null;
  body_html: string | null;
  labels: string[];
  sent_at: string | null;
  contact_id: string | null;
  lead_id: string | null;
  event_id: string | null;
  read_at: string | null;
}

// ---------------------------------------------------------------------------
// Marketing (Phase 8)
// ---------------------------------------------------------------------------

export type CampaignStatus =
  | "planning"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type ContentChannel =
  | "instagram"
  | "facebook"
  | "tiktok"
  | "blog"
  | "website"
  | "email"
  | "sms"
  | "print"
  | "other";

export type ContentStatus =
  | "drafting"
  | "in_review"
  | "approved"
  | "scheduled"
  | "posted"
  | "archived";

export type CreativeBriefStatus =
  | "drafting"
  | "in_review"
  | "approved"
  | "in_production"
  | "delivered";

export type ShotListStatus = "planning" | "ready" | "shot" | "delivered";

export type AdChannel =
  | "meta"
  | "google"
  | "tiktok"
  | "print"
  | "radio"
  | "out_of_home"
  | "other";

export type AdRequestStatus =
  | "requested"
  | "in_design"
  | "approved"
  | "live"
  | "completed"
  | "cancelled";

export type UGCTier = "community" | "nano" | "micro" | "mid" | "macro";

export type UGCCollaborationStatus =
  | "pitched"
  | "agreed"
  | "in_progress"
  | "delivered"
  | "posted"
  | "paid"
  | "cancelled";

export interface MarketingCampaign {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  theme: string | null;
  goal: string | null;
  description: string | null;
  status: CampaignStatus;
  starts_on: string | null;
  ends_on: string | null;
  owner_id: string | null;
  location_id: string | null;
  channels: ContentChannel[];
  budget_cents: number | null;
}

export interface ContentItem {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  campaign_id: string | null;
  title: string;
  channel: ContentChannel;
  body: string | null;
  caption: string | null;
  hashtags: string[];
  asset_url: string | null;
  status: ContentStatus;
  scheduled_for: string | null;
  posted_at: string | null;
  assignee_id: string | null;
  approved_by: string | null;
  approved_at: string | null;
  location_id: string | null;
  notes: string | null;
  subject: string | null;
  preheader: string | null;
  target_tags: string[];
}

export interface CreativeBrief {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  campaign_id: string | null;
  title: string;
  audience: string | null;
  objectives: string | null;
  key_messages: string | null;
  mandatories: string | null;
  tone: string | null;
  deliverables: string | null;
  deadline_on: string | null;
  status: CreativeBriefStatus;
}

export interface ShotList {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  campaign_id: string | null;
  name: string;
  shoot_date: string | null;
  location_id: string | null;
  photographer: string | null;
  status: ShotListStatus;
  notes: string | null;
}

export interface ShotListItem {
  id: string;
  created_at: string;
  updated_at: string;
  shot_list_id: string;
  position: number;
  description: string;
  hero: boolean;
  props: string | null;
  setup_notes: string | null;
  is_done: boolean;
  asset_url: string | null;
}

export interface AdRequest {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  campaign_id: string | null;
  title: string;
  channel: AdChannel;
  goal: string | null;
  audience: string | null;
  copy: string | null;
  budget_cents: number | null;
  starts_on: string | null;
  ends_on: string | null;
  status: AdRequestStatus;
  requester_id: string | null;
  assignee_id: string | null;
  asset_url: string | null;
  notes: string | null;
}

export interface UGCCreator {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  name: string;
  handle: string | null;
  platforms: string[];
  tier: UGCTier;
  email: string | null;
  phone: string | null;
  city: string | null;
  notes: string | null;
  is_active: boolean;
}

export interface UGCCollaboration {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  creator_id: string;
  campaign_id: string | null;
  deliverable: string;
  brief: string | null;
  compensation: string | null;
  due_on: string | null;
  delivered_at: string | null;
  posted_url: string | null;
  status: UGCCollaborationStatus;
  notes: string | null;
}

export interface CampaignPerformanceNote {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  campaign_id: string;
  metric: string | null;
  result: string | null;
  observation: string | null;
  next_time: string | null;
}

export interface MarketingSubscriber {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  email: string | null;
  phone: string | null;
  name: string | null;
  tags: string[];
  source: string | null;
  location_id: string | null;
  opt_in_email: boolean;
  opt_in_sms: boolean;
  opt_out_email_at: string | null;
  opt_out_sms_at: string | null;
  last_emailed_at: string | null;
  last_smsed_at: string | null;
  notes: string | null;
  is_active: boolean;
}

export type SendChannel = "email" | "sms";
export type SendProvider = "resend" | "twilio" | "test";
export type SendStatus =
  | "queued"
  | "sending"
  | "sent"
  | "delivered"
  | "bounced"
  | "opened"
  | "clicked"
  | "complained"
  | "failed"
  | "unsubscribed";

export interface MarketingSend {
  id: string;
  created_at: string;
  updated_at: string;
  content_item_id: string;
  subscriber_id: string | null;
  channel: SendChannel;
  provider: SendProvider;
  provider_message_id: string | null;
  to_email: string | null;
  to_phone: string | null;
  status: SendStatus;
  error_message: string | null;
  sent_at: string | null;
  delivered_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  unsubscribed_at: string | null;
}

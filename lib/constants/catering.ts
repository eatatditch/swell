import type {
  CateringEventStatus,
  CateringFollowupKind,
  CateringLeadStatus,
  CateringServiceType,
  EventMenuCategory,
  EventPaymentKind,
  EventPaymentMethod,
  EventPaymentStatus,
  EventUgcContentType,
  EventUgcStatus,
  ModifierSelectionKind,
  ReviewPlatform,
} from "@/lib/types/database";

export const LEAD_STATUSES: CateringLeadStatus[] = [
  "lead",
  "quote_sent",
  "follow_up",
  "booked",
  "lost",
];

export const LEAD_STATUS_LABELS: Record<CateringLeadStatus, string> = {
  lead: "Lead",
  quote_sent: "Quote Sent",
  follow_up: "Follow up",
  booked: "Booked",
  lost: "Lost",
};

// Win probability per stage (used to weight pipeline value forecasting).
export const LEAD_STAGE_PROBABILITY: Record<CateringLeadStatus, number> = {
  lead: 0.1,
  quote_sent: 0.5,
  follow_up: 0.6,
  booked: 1,
  lost: 0,
};

// What stage to move to via "Advance stage" (skips lost).
export const LEAD_STAGE_FORWARD: Partial<
  Record<CateringLeadStatus, CateringLeadStatus>
> = {
  lead: "quote_sent",
  quote_sent: "follow_up",
  follow_up: "booked",
};

// Accent stripe shown on top of each pipeline column.
export const LEAD_STAGE_STRIPE: Record<CateringLeadStatus, string> = {
  lead: "bg-accent",
  quote_sent: "bg-accent",
  follow_up: "bg-accent",
  booked: "bg-emerald-500",
  lost: "bg-rose-400",
};

export const LEAD_STATUS_COLORS: Record<CateringLeadStatus, string> = {
  lead: "bg-muted text-foreground",
  quote_sent: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100",
  follow_up: "bg-accent/15 text-accent",
  booked: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
  lost: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100",
};

export const EVENT_STATUSES: CateringEventStatus[] = [
  "booked",
  "confirmed",
  "executed",
  "canceled",
];

export const EVENT_STATUS_LABELS: Record<CateringEventStatus, string> = {
  booked: "Booked",
  confirmed: "Confirmed",
  executed: "Executed",
  canceled: "Canceled",
};

export const EVENT_STATUS_COLORS: Record<CateringEventStatus, string> = {
  booked: "bg-primary/15 text-primary",
  confirmed: "bg-accent/15 text-accent",
  executed: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
  canceled: "bg-muted text-muted-foreground",
};

export const SERVICE_TYPES: CateringServiceType[] = [
  "drop_off",
  "buffet",
  "plated",
  "family_style",
  "cocktail",
  "food_truck",
  "other",
];

export const SERVICE_TYPE_LABELS: Record<CateringServiceType, string> = {
  drop_off: "Drop-off",
  buffet: "Buffet",
  plated: "Plated",
  family_style: "Family style",
  cocktail: "Cocktail",
  food_truck: "Food truck",
  other: "Other",
};

// Catering menu library — common unit suggestions for items.
export const MENU_ITEM_UNITS: string[] = [
  "each",
  "per person",
  "per dozen",
  "per half dozen",
  "half tray",
  "full tray",
  "per pound",
  "per bottle",
  "per gallon",
  "per hour",
];

export const MODIFIER_SELECTION_LABELS: Record<ModifierSelectionKind, string> = {
  single: "Pick one",
  multi: "Pick multiple",
};

export const FOLLOWUP_KINDS: CateringFollowupKind[] = ["call", "email", "task"];

export const FOLLOWUP_KIND_LABELS: Record<CateringFollowupKind, string> = {
  call: "Call",
  email: "Email",
  task: "Task",
};

export const MENU_CATEGORIES: EventMenuCategory[] = [
  "food",
  "beverage",
  "rental",
  "service",
  "other",
];

export const MENU_CATEGORY_LABELS: Record<EventMenuCategory, string> = {
  food: "Food",
  beverage: "Beverage",
  rental: "Rental",
  service: "Service",
  other: "Other",
};

export const PAYMENT_KINDS: EventPaymentKind[] = [
  "deposit",
  "balance",
  "refund",
  "gratuity",
];

export const PAYMENT_KIND_LABELS: Record<EventPaymentKind, string> = {
  deposit: "Deposit",
  balance: "Balance",
  refund: "Refund",
  gratuity: "Gratuity",
};

export const PAYMENT_STATUSES: EventPaymentStatus[] = [
  "pending",
  "received",
  "refunded",
  "waived",
];

export const PAYMENT_STATUS_LABELS: Record<EventPaymentStatus, string> = {
  pending: "Pending",
  received: "Received",
  refunded: "Refunded",
  waived: "Waived",
};

export const PAYMENT_STATUS_COLORS: Record<EventPaymentStatus, string> = {
  pending: "bg-muted text-foreground",
  received: "bg-primary/15 text-primary",
  refunded: "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  waived: "bg-muted text-muted-foreground",
};

export const PAYMENT_METHODS: EventPaymentMethod[] = [
  "cash",
  "check",
  "card",
  "ach",
  "other",
];

export const PAYMENT_METHOD_LABELS: Record<EventPaymentMethod, string> = {
  cash: "Cash",
  check: "Check",
  card: "Card",
  ach: "ACH",
  other: "Other",
};

export const UGC_CONTENT_TYPES: EventUgcContentType[] = [
  "photos",
  "reel",
  "tag",
  "feature",
  "other",
];

export const UGC_CONTENT_TYPE_LABELS: Record<EventUgcContentType, string> = {
  photos: "Photos",
  reel: "Reel",
  tag: "Tag",
  feature: "Feature",
  other: "Other",
};

export const UGC_STATUSES: EventUgcStatus[] = [
  "planned",
  "captured",
  "posted",
  "declined",
];

export const UGC_STATUS_LABELS: Record<EventUgcStatus, string> = {
  planned: "Planned",
  captured: "Captured",
  posted: "Posted",
  declined: "Declined",
};

export const UGC_STATUS_COLORS: Record<EventUgcStatus, string> = {
  planned: "bg-muted text-foreground",
  captured: "bg-accent/15 text-accent",
  posted: "bg-primary/15 text-primary",
  declined: "bg-muted text-muted-foreground",
};

export const REVIEW_PLATFORMS: ReviewPlatform[] = [
  "google",
  "yelp",
  "tripadvisor",
  "opentable",
  "other",
];

export const REVIEW_PLATFORM_LABELS: Record<ReviewPlatform, string> = {
  google: "Google",
  yelp: "Yelp",
  tripadvisor: "TripAdvisor",
  opentable: "OpenTable",
  other: "Other",
};

// =============================================================================
// Money helpers
// =============================================================================

export function formatCents(amountCents: number): string {
  return (amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function dollarsToCents(value: string | number): number {
  const n = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export function centsToDollarString(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function formatEventDate(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(hms: string | null): string {
  if (!hms) return "";
  const [h, m] = hms.split(":");
  const hour = Number.parseInt(h, 10);
  const minute = Number.parseInt(m, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hms;
  const period = hour >= 12 ? "PM" : "AM";
  const display = ((hour + 11) % 12) + 1;
  return `${display}:${minute.toString().padStart(2, "0")} ${period}`;
}

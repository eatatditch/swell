import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CateringContact,
  CateringEvent,
  CateringFollowup,
  CateringLead,
  CateringLeadStatus,
  EventMenuItem,
  EventPayment,
  EventReviewRequest,
  EventUgcOpportunity,
  Location,
  ProfileLite,
} from "@/lib/types/database";

export type ContactLite = Pick<
  CateringContact,
  "id" | "full_name" | "email" | "phone" | "company"
>;

export type LeadWithOwner = CateringLead & {
  owner: ProfileLite | null;
  creator: ProfileLite | null;
  contact: ContactLite;
  location: Pick<Location, "id" | "name" | "slug"> | null;
};

export type ContactWithStats = CateringContact & {
  lead_count: number;
  event_count: number;
  last_activity_at: string | null;
};

export type EventWithRefs = CateringEvent & {
  owner: ProfileLite | null;
  location: Pick<Location, "id" | "name" | "slug"> | null;
  lead: {
    id: string;
    contact: Pick<CateringContact, "id" | "full_name"> | null;
  } | null;
};

export type FollowupWithAssignee = CateringFollowup & {
  assignee: ProfileLite | null;
  creator: ProfileLite | null;
};

export type PaymentWithRecorder = EventPayment & {
  recorder: ProfileLite | null;
};

export type UgcWithOwner = EventUgcOpportunity & {
  owner: ProfileLite | null;
};

const LEAD_SELECT =
  "*, owner:profiles!catering_leads_owner_id_fkey(id, full_name, email, avatar_url), creator:profiles!catering_leads_created_by_fkey(id, full_name, email, avatar_url), contact:catering_contacts!catering_leads_contact_id_fkey(id, full_name, email, phone, company), location:locations(id, name, slug)";

const EVENT_SELECT =
  "*, owner:profiles!catering_events_owner_id_fkey(id, full_name, email, avatar_url), location:locations(id, name, slug), lead:catering_leads!catering_events_lead_id_fkey(id, contact:catering_contacts!catering_leads_contact_id_fkey(id, full_name))";

export async function listLeads(opts: {
  locationId?: string | null;
  search?: string;
  status?: CateringLeadStatus | "all";
}): Promise<LeadWithOwner[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("catering_leads")
    .select(LEAD_SELECT)
    .order("status")
    .order("pipeline_position", { ascending: true })
    .order("created_at", { ascending: false });

  if (opts.locationId) {
    query = query.eq("location_id", opts.locationId);
  }
  if (opts.status && opts.status !== "all") {
    query = query.eq("status", opts.status);
  }
  if (opts.search && opts.search.trim()) {
    // Search on contact fields requires a contact subquery — find matching
    // contact ids first, then filter leads.
    const s = `%${opts.search.trim()}%`;
    const { data: matches } = await supabase
      .from("catering_contacts")
      .select("id")
      .or(`full_name.ilike.${s},company.ilike.${s},email.ilike.${s}`);
    const ids = (matches ?? []).map((m) => m.id);
    if (ids.length === 0) return [];
    query = query.in("contact_id", ids);
  }

  const { data } = await query;
  return (data ?? []) as LeadWithOwner[];
}

export async function listContacts(opts: {
  search?: string;
}): Promise<ContactWithStats[]> {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("catering_contacts")
    .select("*")
    .order("full_name", { ascending: true });

  if (opts.search && opts.search.trim()) {
    const s = `%${opts.search.trim()}%`;
    query = query.or(
      `full_name.ilike.${s},company.ilike.${s},email.ilike.${s},phone.ilike.${s}`,
    );
  }

  const { data: contacts } = await query;
  const list = (contacts ?? []) as CateringContact[];
  if (list.length === 0) return [];

  const ids = list.map((c) => c.id);

  const [leadAgg, eventAgg] = await Promise.all([
    supabase
      .from("catering_leads")
      .select("contact_id, updated_at")
      .in("contact_id", ids),
    supabase
      .from("catering_events")
      .select("contact_id, updated_at")
      .in("contact_id", ids),
  ]);

  const counts = new Map<
    string,
    { leads: number; events: number; last: string | null }
  >();
  for (const id of ids) counts.set(id, { leads: 0, events: 0, last: null });

  for (const l of (leadAgg.data ?? []) as { contact_id: string; updated_at: string }[]) {
    const c = counts.get(l.contact_id);
    if (!c) continue;
    c.leads += 1;
    if (!c.last || l.updated_at > c.last) c.last = l.updated_at;
  }
  for (const e of (eventAgg.data ?? []) as { contact_id: string; updated_at: string }[]) {
    const c = counts.get(e.contact_id);
    if (!c) continue;
    c.events += 1;
    if (!c.last || e.updated_at > c.last) c.last = e.updated_at;
  }

  return list.map((c) => {
    const stats = counts.get(c.id) ?? { leads: 0, events: 0, last: null };
    return {
      ...c,
      lead_count: stats.leads,
      event_count: stats.events,
      last_activity_at: stats.last,
    } satisfies ContactWithStats;
  });
}

export async function getContact(id: string): Promise<CateringContact | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_contacts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as CateringContact | null) ?? null;
}

export async function listLeadsForContact(
  contactId: string,
): Promise<LeadWithOwner[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_leads")
    .select(LEAD_SELECT)
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });
  return (data ?? []) as LeadWithOwner[];
}

export async function listEventsForContact(
  contactId: string,
): Promise<EventWithRefs[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_events")
    .select(EVENT_SELECT)
    .eq("contact_id", contactId)
    .order("event_date", { ascending: false });
  return (data ?? []) as EventWithRefs[];
}

export async function getLead(id: string): Promise<LeadWithOwner | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as LeadWithOwner | null) ?? null;
}

export async function listFollowups(
  leadId: string,
): Promise<FollowupWithAssignee[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_followups")
    .select(
      "*, assignee:profiles!catering_followups_assigned_to_fkey(id, full_name, email, avatar_url), creator:profiles!catering_followups_created_by_fkey(id, full_name, email, avatar_url)",
    )
    .eq("lead_id", leadId)
    .order("done_at", { ascending: true, nullsFirst: true })
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as FollowupWithAssignee[];
}

export async function listEvents(opts: {
  locationId?: string | null;
  status?: string;
  from?: string;
  to?: string;
}): Promise<EventWithRefs[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("catering_events")
    .select(EVENT_SELECT)
    .order("event_date", { ascending: true });

  if (opts.locationId) query = query.eq("location_id", opts.locationId);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  if (opts.from) query = query.gte("event_date", opts.from);
  if (opts.to) query = query.lte("event_date", opts.to);

  const { data } = await query;
  return (data ?? []) as EventWithRefs[];
}

export async function getEvent(id: string): Promise<EventWithRefs | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as EventWithRefs | null) ?? null;
}

export async function listMenuItems(eventId: string): Promise<EventMenuItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("event_menu_items")
    .select("*")
    .eq("event_id", eventId)
    .order("position");
  return (data ?? []) as EventMenuItem[];
}

export async function listPayments(
  eventId: string,
): Promise<PaymentWithRecorder[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("event_payments")
    .select(
      "*, recorder:profiles!event_payments_recorded_by_fkey(id, full_name, email, avatar_url)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as PaymentWithRecorder[];
}

export async function listUgc(eventId: string): Promise<UgcWithOwner[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("event_ugc_opportunities")
    .select(
      "*, owner:profiles!event_ugc_opportunities_owner_id_fkey(id, full_name, email, avatar_url)",
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as UgcWithOwner[];
}

export async function listReviewRequests(
  eventId: string,
): Promise<EventReviewRequest[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("event_review_requests")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return (data ?? []) as EventReviewRequest[];
}

export interface CateringOverview {
  openLeads: number;
  thisWeekEvents: number;
  monthRevenueCents: number;
  pendingFollowups: number;
}

export async function getCateringOverview(opts: {
  locationId?: string | null;
}): Promise<CateringOverview> {
  const supabase = createSupabaseServerClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const leadsQuery = supabase
    .from("catering_leads")
    .select("id", { count: "exact", head: true })
    .not("status", "in", "(booked,lost)");

  const eventsThisWeekQuery = supabase
    .from("catering_events")
    .select("id", { count: "exact", head: true })
    .gte("event_date", iso(weekStart))
    .lt("event_date", iso(weekEnd))
    .neq("status", "canceled");

  const followupsQuery = supabase
    .from("catering_followups")
    .select("id", { count: "exact", head: true })
    .is("done_at", null);

  let monthPaymentsQuery = supabase
    .from("event_payments")
    .select("amount_cents, event_id, status, paid_at, catering_events!inner(event_date, location_id)")
    .eq("status", "received")
    .gte("catering_events.event_date", iso(monthStart))
    .lt("catering_events.event_date", iso(monthEnd));

  if (opts.locationId) {
    monthPaymentsQuery = monthPaymentsQuery.eq(
      "catering_events.location_id",
      opts.locationId,
    );
  }

  const [leads, events, followups, payments] = await Promise.all([
    leadsQuery,
    opts.locationId
      ? eventsThisWeekQuery.eq("location_id", opts.locationId)
      : eventsThisWeekQuery,
    followupsQuery,
    monthPaymentsQuery,
  ]);

  const monthRevenueCents = (
    (payments.data ?? []) as { amount_cents: number }[]
  ).reduce((acc, p) => acc + (p.amount_cents ?? 0), 0);

  return {
    openLeads: leads.count ?? 0,
    thisWeekEvents: events.count ?? 0,
    monthRevenueCents,
    pendingFollowups: followups.count ?? 0,
  };
}

export interface PaymentTotals {
  quoted: number;
  received: number;
  pending: number;
  refunded: number;
  balance: number;
}

export function paymentTotals(
  event: Pick<CateringEvent, "total_quoted_cents">,
  payments: Pick<EventPayment, "amount_cents" | "kind" | "status">[],
): PaymentTotals {
  let received = 0;
  let pending = 0;
  let refunded = 0;
  for (const p of payments) {
    if (p.kind === "refund" || p.status === "refunded") {
      refunded += p.amount_cents;
    } else if (p.status === "received") {
      received += p.amount_cents;
    } else if (p.status === "pending") {
      pending += p.amount_cents;
    }
  }
  return {
    quoted: event.total_quoted_cents,
    received,
    pending,
    refunded,
    balance: Math.max(0, event.total_quoted_cents - received + refunded),
  };
}

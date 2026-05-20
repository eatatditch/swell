"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  SERVICE_TYPES,
} from "@/lib/constants/catering";
import type { CateringEventStatus } from "@/lib/types/database";

const stringy = z.string().trim();

const eventSchema = z.object({
  locationId: z.string().uuid(),
  ownerId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  title: stringy.min(1, "Title required").max(200),
  status: z.enum(EVENT_STATUSES as [string, ...string[]]).default("booked"),
  serviceType: z.enum(SERVICE_TYPES as [string, ...string[]]).default("buffet"),
  eventDate: stringy.min(1, "Date required"),
  startTime: stringy.max(16).optional().nullable(),
  endTime: stringy.max(16).optional().nullable(),
  guestCount: z.number().int().min(0).max(100_000).optional().nullable(),
  venue: stringy.max(200).optional().nullable(),
  room: stringy.max(200).optional().nullable(),
  contactName: stringy.max(200).optional().nullable(),
  contactPhone: stringy.max(64).optional().nullable(),
  contactEmail: z.string().email().or(z.literal("")).optional().nullable(),
  billingName: stringy.max(200).optional().nullable(),
  billingAddress: stringy.max(1000).optional().nullable(),
  allergensNotes: stringy.max(4000).optional().nullable(),
  specialRequests: stringy.max(4000).optional().nullable(),
  setupNotes: stringy.max(4000).optional().nullable(),
  breakdownNotes: stringy.max(4000).optional().nullable(),
  equipmentNotes: stringy.max(4000).optional().nullable(),
  staffingNotes: stringy.max(4000).optional().nullable(),
  beverageNotes: stringy.max(4000).optional().nullable(),
  internalNotes: stringy.max(4000).optional().nullable(),
  totalQuoted: z.number().min(0).max(100_000_000).optional().nullable(),
});

export type EventInput = z.input<typeof eventSchema>;

function mapPayload(v: z.output<typeof eventSchema>) {
  return {
    location_id: v.locationId,
    owner_id: v.ownerId ?? null,
    lead_id: v.leadId ?? null,
    title: v.title,
    status: v.status,
    service_type: v.serviceType,
    event_date: v.eventDate,
    start_time: v.startTime || null,
    end_time: v.endTime || null,
    guest_count: v.guestCount ?? null,
    venue: v.venue || null,
    room: v.room || null,
    contact_name: v.contactName || null,
    contact_phone: v.contactPhone || null,
    contact_email: v.contactEmail || null,
    billing_name: v.billingName || null,
    billing_address: v.billingAddress || null,
    allergens_notes: v.allergensNotes || null,
    special_requests: v.specialRequests || null,
    setup_notes: v.setupNotes || null,
    breakdown_notes: v.breakdownNotes || null,
    equipment_notes: v.equipmentNotes || null,
    staffing_notes: v.staffingNotes || null,
    beverage_notes: v.beverageNotes || null,
    internal_notes: v.internalNotes || null,
    total_quoted_cents:
      v.totalQuoted != null ? Math.round(v.totalQuoted * 100) : 0,
  };
}

export async function createCateringEvent(raw: EventInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = eventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: event, error } = await supabase
    .from("catering_events")
    .insert({
      created_by: user.id,
      ...mapPayload(v),
      owner_id: v.ownerId ?? user.id,
    })
    .select("*")
    .single();

  if (error || !event) {
    return { error: error?.message ?? "Could not create event" };
  }

  await logActivity({
    verb: "created",
    objectType: "catering_event",
    objectId: event.id,
    summary: `${event.title} · ${event.event_date}`,
    locationId: event.location_id,
  });

  if (event.owner_id && event.owner_id !== user.id) {
    await notify({
      recipientId: event.owner_id,
      kind: "event_assigned",
      title: "Catering event assigned",
      body: event.title,
      link: `/catering/events/${event.id}`,
      sourceType: "catering_event",
      sourceId: event.id,
    });
  }

  revalidatePath("/catering", "layout");
  return { event };
}

const updateEventSchema = eventSchema.extend({ id: z.string().uuid() });

export type UpdateEventInput = z.input<typeof updateEventSchema>;

export async function updateCateringEvent(raw: UpdateEventInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: event, error } = await supabase
    .from("catering_events")
    .update(mapPayload(v))
    .eq("id", v.id)
    .select("*")
    .single();

  if (error || !event) {
    return { error: error?.message ?? "Could not update event" };
  }

  await logActivity({
    verb: "updated",
    objectType: "catering_event",
    objectId: event.id,
    summary: event.title,
    locationId: event.location_id,
  });

  revalidatePath("/catering", "layout");
  return { event };
}

export async function setEventStatus(
  eventId: string,
  status: CateringEventStatus,
  cancelReason?: string | null,
) {
  const supabase = createSupabaseServerClient();
  const update: Record<string, unknown> = { status };
  if (status === "canceled") {
    update.canceled_at = new Date().toISOString();
    update.cancel_reason = cancelReason ?? null;
  } else {
    update.canceled_at = null;
    update.cancel_reason = null;
  }

  const { data: event, error } = await supabase
    .from("catering_events")
    .update(update)
    .eq("id", eventId)
    .select("*")
    .single();
  if (error || !event) {
    return { error: error?.message ?? "Could not update status" };
  }

  await logActivity({
    verb:
      status === "confirmed"
        ? "confirmed"
        : status === "canceled"
          ? "canceled"
          : "updated",
    objectType: "catering_event",
    objectId: event.id,
    summary: `${event.title} → ${EVENT_STATUS_LABELS[status]}`,
    locationId: event.location_id,
    metadata: { status },
  });

  revalidatePath("/catering", "layout");
  return { event };
}

export async function deleteCateringEvent(eventId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("catering_events")
    .delete()
    .eq("id", eventId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}

export async function confirmHeadcount(eventId: string, guestCount: number) {
  const supabase = createSupabaseServerClient();
  const { data: event, error } = await supabase
    .from("catering_events")
    .update({
      guest_count: guestCount,
      headcount_confirmed_at: new Date().toISOString(),
    })
    .eq("id", eventId)
    .select("*")
    .single();
  if (error || !event) {
    return { error: error?.message ?? "Could not confirm headcount" };
  }
  await logActivity({
    verb: "updated",
    objectType: "catering_event",
    objectId: event.id,
    summary: `Headcount confirmed: ${guestCount}`,
    locationId: event.location_id,
    metadata: { headcount: guestCount },
  });
  revalidatePath("/catering", "layout");
  return { event };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  LEAD_STAGE_FORWARD,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { CateringLeadStatus } from "@/lib/types/database";

const stringy = z.string().trim();

const createSchema = z.object({
  locationId: z.string().uuid().optional().nullable(),
  contactName: stringy.min(1, "Contact name required").max(200),
  contactEmail: z.string().email().optional().or(z.literal("")).nullable(),
  contactPhone: stringy.max(64).optional().nullable(),
  company: stringy.max(200).optional().nullable(),
  eventType: stringy.max(200).optional().nullable(),
  desiredDate: stringy.max(32).optional().nullable(),
  partySize: z.number().int().min(0).max(100_000).optional().nullable(),
  budgetLow: z.number().min(0).max(10_000_000).optional().nullable(),
  budgetHigh: z.number().min(0).max(10_000_000).optional().nullable(),
  source: stringy.max(200).optional().nullable(),
  notes: stringy.max(10_000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
});

export type CreateLeadInput = z.input<typeof createSchema>;

export async function createCateringLead(raw: CreateLeadInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: lead, error } = await supabase
    .from("catering_leads")
    .insert({
      created_by: user.id,
      location_id: v.locationId ?? null,
      owner_id: v.ownerId ?? user.id,
      contact_name: v.contactName,
      contact_email: v.contactEmail || null,
      contact_phone: v.contactPhone || null,
      company: v.company || null,
      event_type: v.eventType || null,
      desired_date: v.desiredDate || null,
      party_size: v.partySize ?? null,
      budget_low_cents:
        v.budgetLow != null ? Math.round(v.budgetLow * 100) : null,
      budget_high_cents:
        v.budgetHigh != null ? Math.round(v.budgetHigh * 100) : null,
      source: v.source || null,
      notes: v.notes || null,
      status: "new",
    })
    .select("*")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not create lead" };
  }

  await logActivity({
    verb: "created",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: `${lead.contact_name}${lead.company ? ` · ${lead.company}` : ""}`,
    locationId: lead.location_id,
  });

  if (lead.owner_id && lead.owner_id !== user.id) {
    await notify({
      recipientId: lead.owner_id,
      kind: "lead_assigned",
      title: "Catering lead assigned",
      body: lead.contact_name,
      link: `/catering/leads/${lead.id}`,
      sourceType: "catering_lead",
      sourceId: lead.id,
    });
  }

  revalidatePath("/catering", "layout");
  return { lead };
}

const updateSchema = createSchema.extend({
  id: z.string().uuid(),
});

export type UpdateLeadInput = z.input<typeof updateSchema>;

export async function updateCateringLead(raw: UpdateLeadInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: lead, error } = await supabase
    .from("catering_leads")
    .update({
      location_id: v.locationId ?? null,
      owner_id: v.ownerId ?? null,
      contact_name: v.contactName,
      contact_email: v.contactEmail || null,
      contact_phone: v.contactPhone || null,
      company: v.company || null,
      event_type: v.eventType || null,
      desired_date: v.desiredDate || null,
      party_size: v.partySize ?? null,
      budget_low_cents:
        v.budgetLow != null ? Math.round(v.budgetLow * 100) : null,
      budget_high_cents:
        v.budgetHigh != null ? Math.round(v.budgetHigh * 100) : null,
      source: v.source || null,
      notes: v.notes || null,
    })
    .eq("id", v.id)
    .select("*")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not update lead" };
  }

  await logActivity({
    verb: "updated",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: lead.contact_name,
    locationId: lead.location_id,
  });

  revalidatePath("/catering", "layout");
  return { lead };
}

const statusSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  lostReason: z.string().max(2000).optional().nullable(),
});

export async function setLeadStatus(
  leadId: string,
  status: CateringLeadStatus,
  lostReason?: string | null,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = statusSchema.safeParse({ leadId, status, lostReason });
  if (!parsed.success) return { error: "Invalid input" };

  const update: Record<string, unknown> = { status };
  if (status === "lost") {
    update.lost_reason = lostReason ?? null;
    update.closed_at = new Date().toISOString();
  } else if (status === "booked") {
    update.closed_at = new Date().toISOString();
  } else {
    update.closed_at = null;
    update.lost_reason = null;
  }

  const { data: lead, error } = await supabase
    .from("catering_leads")
    .update(update)
    .eq("id", leadId)
    .select("*")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not update lead status" };
  }

  await logActivity({
    verb: status === "lost" ? "lost" : "advanced",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: `${lead.contact_name} → ${LEAD_STATUS_LABELS[status]}`,
    locationId: lead.location_id,
    metadata: { status },
  });

  revalidatePath("/catering", "layout");
  return { lead };
}

export async function advanceLead(leadId: string) {
  const supabase = createSupabaseServerClient();
  const { data: lead } = await supabase
    .from("catering_leads")
    .select("id, status")
    .eq("id", leadId)
    .maybeSingle();
  if (!lead) return { error: "Lead not found" };
  const next = LEAD_STAGE_FORWARD[lead.status as CateringLeadStatus];
  if (!next) return { error: "Already at final stage" };
  return setLeadStatus(leadId, next);
}

export async function deleteCateringLead(leadId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("catering_leads")
    .delete()
    .eq("id", leadId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}

const convertSchema = z.object({
  leadId: z.string().uuid(),
  title: stringy.min(1).max(200),
  eventDate: stringy.min(1),
  locationId: z.string().uuid(),
});

export type ConvertLeadInput = z.input<typeof convertSchema>;

// Concurrency-safe: if the lead already has a linked event, return it.
export async function convertLeadToEvent(raw: ConvertLeadInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = convertSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: lead, error: leadErr } = await supabase
    .from("catering_leads")
    .select("*")
    .eq("id", v.leadId)
    .maybeSingle();
  if (leadErr || !lead) return { error: leadErr?.message ?? "Lead not found" };

  if (lead.converted_event_id) {
    return { event: { id: lead.converted_event_id as string }, alreadyLinked: true };
  }

  const { data: event, error: eventErr } = await supabase
    .from("catering_events")
    .insert({
      created_by: user.id,
      owner_id: lead.owner_id ?? user.id,
      lead_id: lead.id,
      location_id: v.locationId,
      title: v.title,
      event_date: v.eventDate,
      guest_count: lead.party_size,
      contact_name: lead.contact_name,
      contact_phone: lead.contact_phone,
      contact_email: lead.contact_email,
      billing_name: lead.company || lead.contact_name,
      status: "booked",
    })
    .select("*")
    .single();

  if (eventErr || !event) {
    return { error: eventErr?.message ?? "Could not create event" };
  }

  await supabase
    .from("catering_leads")
    .update({
      converted_event_id: event.id,
      status: "booked",
      closed_at: new Date().toISOString(),
    })
    .eq("id", lead.id);

  await logActivity({
    verb: "converted",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: `Lead → event "${event.title}"`,
    locationId: event.location_id,
    metadata: { event_id: event.id },
  });

  await logActivity({
    verb: "created",
    objectType: "catering_event",
    objectId: event.id,
    summary: event.title,
    locationId: event.location_id,
    metadata: { from_lead: lead.id },
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

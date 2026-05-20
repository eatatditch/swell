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

const newContactSchema = z.object({
  fullName: stringy.min(1).max(200),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: stringy.max(64).optional().nullable(),
  company: stringy.max(200).optional().nullable(),
});

const contactRefSchema = z.union([
  z.object({ contactId: z.string().uuid(), newContact: z.undefined().optional() }),
  z.object({
    contactId: z.undefined().optional(),
    newContact: newContactSchema,
  }),
]);

const baseLeadFields = z.object({
  locationId: z.string().uuid().optional().nullable(),
  eventType: stringy.max(200).optional().nullable(),
  desiredDate: stringy.max(32).optional().nullable(),
  partySize: z.number().int().min(0).max(100_000).optional().nullable(),
  budgetLow: z.number().min(0).max(10_000_000).optional().nullable(),
  budgetHigh: z.number().min(0).max(10_000_000).optional().nullable(),
  estimatedValue: z.number().min(0).max(10_000_000).optional().nullable(),
  source: stringy.max(200).optional().nullable(),
  notes: stringy.max(10_000).optional().nullable(),
  ownerId: z.string().uuid().optional().nullable(),
});

const createSchema = z.intersection(baseLeadFields, contactRefSchema);

export type CreateLeadInput = z.input<typeof createSchema>;

async function resolveContactId(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  ref: z.infer<typeof contactRefSchema>,
): Promise<{ contactId: string } | { error: string }> {
  if ("contactId" in ref && ref.contactId) {
    return { contactId: ref.contactId };
  }
  if ("newContact" in ref && ref.newContact) {
    const nc = ref.newContact;
    const { data, error } = await supabase
      .from("catering_contacts")
      .insert({
        created_by: userId,
        full_name: nc.fullName,
        email: nc.email || null,
        phone: nc.phone || null,
        company: nc.company || null,
      })
      .select("id")
      .single();
    if (error || !data) {
      return { error: error?.message ?? "Could not create contact" };
    }
    await logActivity({
      verb: "created",
      objectType: "catering_contact",
      objectId: data.id,
      summary: nc.fullName,
    });
    return { contactId: data.id };
  }
  return { error: "A contact is required" };
}

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

  const resolved = await resolveContactId(supabase, user.id, v);
  if ("error" in resolved) return { error: resolved.error };

  // Newest leads land at the top of the "lead" column.
  const { data: topPosition } = await supabase
    .from("catering_leads")
    .select("pipeline_position")
    .eq("status", "lead")
    .order("pipeline_position", { ascending: true })
    .limit(1)
    .maybeSingle();

  const insertPosition = (topPosition?.pipeline_position ?? 0) - 1;

  const { data: lead, error } = await supabase
    .from("catering_leads")
    .insert({
      created_by: user.id,
      location_id: v.locationId ?? null,
      owner_id: v.ownerId ?? user.id,
      contact_id: resolved.contactId,
      event_type: v.eventType || null,
      desired_date: v.desiredDate || null,
      party_size: v.partySize ?? null,
      budget_low_cents: v.budgetLow != null ? Math.round(v.budgetLow * 100) : null,
      budget_high_cents:
        v.budgetHigh != null ? Math.round(v.budgetHigh * 100) : null,
      estimated_value_cents:
        v.estimatedValue != null ? Math.round(v.estimatedValue * 100) : null,
      source: v.source || null,
      notes: v.notes || null,
      status: "lead",
      pipeline_position: insertPosition,
    })
    .select("*, contact:catering_contacts!catering_leads_contact_id_fkey(full_name)")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not create lead" };
  }

  const contactName =
    (lead as { contact?: { full_name?: string } }).contact?.full_name ?? "Lead";

  await logActivity({
    verb: "created",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: contactName,
    locationId: lead.location_id,
  });

  if (lead.owner_id && lead.owner_id !== user.id) {
    await notify({
      recipientId: lead.owner_id,
      kind: "lead_assigned",
      title: "Catering lead assigned",
      body: contactName,
      link: `/catering/leads/${lead.id}`,
      sourceType: "catering_lead",
      sourceId: lead.id,
    });
  }

  revalidatePath("/catering", "layout");
  return { lead };
}

const updateSchema = z.intersection(
  baseLeadFields.extend({ id: z.string().uuid() }),
  contactRefSchema,
);

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

  const resolved = await resolveContactId(supabase, user.id, v);
  if ("error" in resolved) return { error: resolved.error };

  const { data: lead, error } = await supabase
    .from("catering_leads")
    .update({
      location_id: v.locationId ?? null,
      owner_id: v.ownerId ?? null,
      contact_id: resolved.contactId,
      event_type: v.eventType || null,
      desired_date: v.desiredDate || null,
      party_size: v.partySize ?? null,
      budget_low_cents:
        v.budgetLow != null ? Math.round(v.budgetLow * 100) : null,
      budget_high_cents:
        v.budgetHigh != null ? Math.round(v.budgetHigh * 100) : null,
      estimated_value_cents:
        v.estimatedValue != null ? Math.round(v.estimatedValue * 100) : null,
      source: v.source || null,
      notes: v.notes || null,
    })
    .eq("id", v.id)
    .select("*, contact:catering_contacts!catering_leads_contact_id_fkey(full_name)")
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not update lead" };
  }

  const contactName =
    (lead as { contact?: { full_name?: string } }).contact?.full_name ?? "Lead";

  await logActivity({
    verb: "updated",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: contactName,
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
    .select(
      "*, contact:catering_contacts!catering_leads_contact_id_fkey(full_name)",
    )
    .single();

  if (error || !lead) {
    return { error: error?.message ?? "Could not update lead status" };
  }

  const contactName =
    (lead as { contact?: { full_name?: string } }).contact?.full_name ?? "Lead";

  await logActivity({
    verb: status === "lost" ? "lost" : "advanced",
    objectType: "catering_lead",
    objectId: lead.id,
    summary: `${contactName} → ${LEAD_STATUS_LABELS[status]}`,
    locationId: lead.location_id,
    metadata: { status },
  });

  revalidatePath("/catering", "layout");
  return { lead };
}

const moveSchema = z.object({
  leadId: z.string().uuid(),
  status: z.enum(LEAD_STATUSES as [string, ...string[]]),
  position: z.number().int().min(0).max(1_000_000),
});

// Drag-drop move: update status and position together. Position is the
// 0-indexed slot the card should land in within the destination column.
// All cards at or below that slot in the destination column get bumped.
export async function moveLeadInPipeline(
  raw: z.input<typeof moveSchema>,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = moveSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: existing } = await supabase
    .from("catering_leads")
    .select("id, status, contact:catering_contacts!catering_leads_contact_id_fkey(full_name)")
    .eq("id", v.leadId)
    .maybeSingle();
  if (!existing) return { error: "Lead not found" };

  // Shift other cards in the destination column down to make room.
  const { data: others } = await supabase
    .from("catering_leads")
    .select("id, pipeline_position")
    .eq("status", v.status)
    .neq("id", v.leadId)
    .gte("pipeline_position", v.position)
    .order("pipeline_position", { ascending: true });

  for (const o of others ?? []) {
    await supabase
      .from("catering_leads")
      .update({ pipeline_position: o.pipeline_position + 1 })
      .eq("id", o.id);
  }

  const update: Record<string, unknown> = {
    status: v.status,
    pipeline_position: v.position,
  };
  if (v.status === "booked" || v.status === "lost") {
    update.closed_at = new Date().toISOString();
  } else if (existing.status === "booked" || existing.status === "lost") {
    update.closed_at = null;
  }

  const { error: updateErr } = await supabase
    .from("catering_leads")
    .update(update)
    .eq("id", v.leadId);
  if (updateErr) return { error: updateErr.message };

  if (existing.status !== v.status) {
    const contactName =
      (
        existing as unknown as {
          contact?: { full_name?: string };
        }
      ).contact?.full_name ?? "Lead";
    await logActivity({
      verb: v.status === "lost" ? "lost" : "advanced",
      objectType: "catering_lead",
      objectId: v.leadId,
      summary: `${contactName} → ${LEAD_STATUS_LABELS[v.status as CateringLeadStatus]}`,
      metadata: { status: v.status, from: existing.status },
    });
  }

  revalidatePath("/catering", "layout");
  return { ok: true };
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
    .select(
      "*, contact:catering_contacts!catering_leads_contact_id_fkey(id, full_name, email, phone, company)",
    )
    .eq("id", v.leadId)
    .maybeSingle();
  if (leadErr || !lead) return { error: leadErr?.message ?? "Lead not found" };

  if (lead.converted_event_id) {
    return {
      event: { id: lead.converted_event_id as string },
      alreadyLinked: true,
    };
  }

  const contact = (
    lead as unknown as {
      contact: {
        id: string;
        full_name: string;
        email: string | null;
        phone: string | null;
        company: string | null;
      } | null;
    }
  ).contact;

  const { data: event, error: eventErr } = await supabase
    .from("catering_events")
    .insert({
      created_by: user.id,
      owner_id: lead.owner_id ?? user.id,
      lead_id: lead.id,
      contact_id: contact?.id ?? null,
      location_id: v.locationId,
      title: v.title,
      event_date: v.eventDate,
      guest_count: lead.party_size,
      contact_name: contact?.full_name ?? null,
      contact_phone: contact?.phone ?? null,
      contact_email: contact?.email ?? null,
      billing_name: contact?.company ?? contact?.full_name ?? null,
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

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import {
  PAYMENT_KINDS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
} from "@/lib/constants/catering";

const createSchema = z.object({
  eventId: z.string().uuid(),
  kind: z.enum(PAYMENT_KINDS as [string, ...string[]]).default("deposit"),
  status: z.enum(PAYMENT_STATUSES as [string, ...string[]]).default("pending"),
  method: z.enum(PAYMENT_METHODS as [string, ...string[]]).optional().nullable(),
  amount: z.number().min(0).max(10_000_000),
  dueAt: z.string().optional().nullable(),
  paidAt: z.string().optional().nullable(),
  reference: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export type CreatePaymentInput = z.input<typeof createSchema>;

export async function recordPayment(raw: CreatePaymentInput) {
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

  const { data: event } = await supabase
    .from("catering_events")
    .select("id, title, location_id, owner_id, created_by")
    .eq("id", v.eventId)
    .maybeSingle();
  if (!event) return { error: "Event not found" };

  const payload = {
    created_by: user.id,
    event_id: v.eventId,
    recorded_by: user.id,
    kind: v.kind,
    status: v.status,
    method: v.method ?? null,
    amount_cents: Math.round(v.amount * 100),
    due_at: v.dueAt ? new Date(v.dueAt).toISOString() : null,
    paid_at:
      v.paidAt
        ? new Date(v.paidAt).toISOString()
        : v.status === "received"
          ? new Date().toISOString()
          : null,
    reference: v.reference || null,
    notes: v.notes || null,
  };

  const { data: payment, error } = await supabase
    .from("event_payments")
    .insert(payload)
    .select("*")
    .single();

  if (error || !payment) {
    return {
      error:
        error?.message ??
        "Could not record payment. Manager role required.",
    };
  }

  await logActivity({
    verb: "recorded",
    objectType: "event_payment",
    objectId: payment.id,
    summary: `${payment.kind.toUpperCase()} $${v.amount.toFixed(2)} for ${event.title}`,
    locationId: event.location_id,
    metadata: { kind: payment.kind, status: payment.status },
  });

  if (
    payment.status === "received" &&
    event.owner_id &&
    event.owner_id !== user.id
  ) {
    await notify({
      recipientId: event.owner_id,
      kind: "payment_received",
      title: "Payment received",
      body: `${payment.kind} $${v.amount.toFixed(2)} — ${event.title}`,
      link: `/catering/events/${event.id}`,
      sourceType: "event_payment",
      sourceId: payment.id,
    });
  }

  revalidatePath("/catering", "layout");
  return { payment };
}

const updateStatusSchema = z.object({
  paymentId: z.string().uuid(),
  status: z.enum(PAYMENT_STATUSES as [string, ...string[]]),
});

export async function updatePaymentStatus(
  paymentId: string,
  status: z.infer<typeof updateStatusSchema>["status"],
) {
  const supabase = createSupabaseServerClient();
  const parsed = updateStatusSchema.safeParse({ paymentId, status });
  if (!parsed.success) return { error: "Invalid input" };

  const update: Record<string, unknown> = { status };
  if (status === "received") {
    update.paid_at = new Date().toISOString();
  } else if (status === "pending") {
    update.paid_at = null;
  }

  const { data: payment, error } = await supabase
    .from("event_payments")
    .update(update)
    .eq("id", paymentId)
    .select("*, event:catering_events(id, title, location_id)")
    .single();
  if (error || !payment) {
    return { error: error?.message ?? "Could not update payment" };
  }

  await logActivity({
    verb: status === "received" ? "received" : "updated",
    objectType: "event_payment",
    objectId: payment.id,
    summary: `${payment.kind} → ${status}`,
    locationId:
      (payment.event as { location_id: string | null } | null)?.location_id ??
      null,
  });

  revalidatePath("/catering", "layout");
  return { payment };
}

export async function deletePayment(paymentId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("event_payments")
    .delete()
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/catering", "layout");
  return { ok: true };
}

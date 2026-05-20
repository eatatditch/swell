"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { computeTotals } from "@/lib/constants/catering";

const stringy = z.string().trim();

async function refreshInvoiceTotals(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  invoiceId: string,
) {
  const { data: invoice } = await supabase
    .from("catering_invoices")
    .select("discount_cents, tax_rate_bps, gratuity_rate_bps")
    .eq("id", invoiceId)
    .single();
  if (!invoice) return;

  const { data: lines } = await supabase
    .from("catering_invoice_line_items")
    .select("total_cents")
    .eq("invoice_id", invoiceId);

  const totals = computeTotals({
    lines: ((lines ?? []) as { total_cents: number }[]).map((l) => ({
      total_cents: l.total_cents,
    })),
    discount_cents: invoice.discount_cents,
    tax_rate_bps: invoice.tax_rate_bps,
    gratuity_rate_bps: invoice.gratuity_rate_bps,
  });

  await supabase
    .from("catering_invoices")
    .update({
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      gratuity_cents: totals.gratuity_cents,
      total_cents: totals.total_cents,
    })
    .eq("id", invoiceId);
}

async function refreshInvoiceAmountPaid(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  invoiceId: string,
) {
  const { data: pays } = await supabase
    .from("event_payments")
    .select("amount_cents, kind, status")
    .eq("invoice_id", invoiceId);

  let paid = 0;
  for (const p of (pays ?? []) as {
    amount_cents: number;
    kind: string;
    status: string;
  }[]) {
    if (p.kind === "refund" || p.status === "refunded") {
      paid -= p.amount_cents;
    } else if (p.status === "received") {
      paid += p.amount_cents;
    }
  }
  paid = Math.max(0, paid);

  const { data: inv } = await supabase
    .from("catering_invoices")
    .select("total_cents, status")
    .eq("id", invoiceId)
    .single();

  const update: Record<string, unknown> = { amount_paid_cents: paid };
  if (inv) {
    if (paid >= inv.total_cents && inv.total_cents > 0) {
      update.status = "paid";
      update.paid_at = new Date().toISOString();
    } else if (paid > 0 && inv.status !== "void") {
      update.status = "partially_paid";
    } else if (paid === 0 && inv.status === "partially_paid") {
      update.status = "sent";
    }
  }

  await supabase.from("catering_invoices").update(update).eq("id", invoiceId);
}

// =============================================================================
// Invoice create / update / delete
// =============================================================================
const invoiceSchema = z.object({
  contactId: z.string().uuid(),
  quoteId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  title: stringy.min(1).max(200),
  dueDate: stringy.max(32).optional().nullable(),
  customerNotes: stringy.max(10_000).optional().nullable(),
  internalNotes: stringy.max(10_000).optional().nullable(),
  taxRateBps: z.number().int().min(0).max(100_000).optional().default(0),
  gratuityRateBps: z.number().int().min(0).max(100_000).optional().default(0),
  discount: z.number().min(0).max(10_000_000).optional().default(0),
});

export type CreateInvoiceInput = z.input<typeof invoiceSchema>;

export async function createInvoice(raw: CreateInvoiceInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = invoiceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_invoices")
    .insert({
      created_by: user.id,
      contact_id: v.contactId,
      quote_id: v.quoteId ?? null,
      event_id: v.eventId ?? null,
      location_id: v.locationId ?? null,
      title: v.title,
      due_date: v.dueDate || null,
      customer_notes: v.customerNotes || null,
      internal_notes: v.internalNotes || null,
      tax_rate_bps: v.taxRateBps ?? 0,
      gratuity_rate_bps: v.gratuityRateBps ?? 0,
      discount_cents: Math.round((v.discount ?? 0) * 100),
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create" };

  await logActivity({
    verb: "created",
    objectType: "catering_invoice",
    objectId: data.id,
    summary: `${data.invoice_number}: ${data.title}`,
    locationId: data.location_id,
  });

  revalidatePath("/catering/invoices");
  return { invoice: data };
}

const updateSchema = invoiceSchema.extend({ id: z.string().uuid() });

export async function updateInvoice(raw: z.input<typeof updateSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { error } = await supabase
    .from("catering_invoices")
    .update({
      contact_id: v.contactId,
      quote_id: v.quoteId ?? null,
      event_id: v.eventId ?? null,
      location_id: v.locationId ?? null,
      title: v.title,
      due_date: v.dueDate || null,
      customer_notes: v.customerNotes || null,
      internal_notes: v.internalNotes || null,
      tax_rate_bps: v.taxRateBps ?? 0,
      gratuity_rate_bps: v.gratuityRateBps ?? 0,
      discount_cents: Math.round((v.discount ?? 0) * 100),
    })
    .eq("id", v.id);
  if (error) return { error: error.message };

  await refreshInvoiceTotals(supabase, v.id);
  revalidatePath(`/catering/invoices/${v.id}`);
  revalidatePath("/catering/invoices");
  return { ok: true };
}

export async function deleteInvoice(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("catering_invoices")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catering/invoices");
  return { ok: true };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["draft", "sent", "void"]),
  voidReason: z.string().max(2000).optional().nullable(),
});

export async function setInvoiceStatus(
  raw: z.input<typeof statusSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const update: Record<string, unknown> = { status: v.status };
  const now = new Date().toISOString();
  if (v.status === "sent") update.sent_at = now;
  if (v.status === "void") {
    update.voided_at = now;
    update.void_reason = v.voidReason ?? null;
  }

  const { data, error } = await supabase
    .from("catering_invoices")
    .update(update)
    .eq("id", v.id)
    .select("invoice_number, location_id")
    .single();
  if (error) return { error: error.message };

  await logActivity({
    verb: v.status,
    objectType: "catering_invoice",
    objectId: v.id,
    summary: data?.invoice_number ?? "Invoice",
    locationId: data?.location_id ?? null,
    metadata: { status: v.status },
  });

  revalidatePath(`/catering/invoices/${v.id}`);
  revalidatePath("/catering/invoices");
  return { ok: true };
}

// =============================================================================
// Invoice line items
// =============================================================================
const lineSchema = z.object({
  invoiceId: z.string().uuid(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
  unit: stringy.max(64).optional().default("each"),
  quantity: z.number().min(0).max(1_000_000),
  unitPrice: z.number().min(0).max(10_000_000),
  menuItemId: z.string().uuid().optional().nullable(),
});

export async function addInvoiceLine(raw: z.input<typeof lineSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = lineSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_invoice_line_items")
    .select("position")
    .eq("invoice_id", v.invoiceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { error } = await supabase.from("catering_invoice_line_items").insert({
    invoice_id: v.invoiceId,
    menu_item_id: v.menuItemId ?? null,
    name: v.name,
    description: v.description || null,
    unit: v.unit || "each",
    quantity: v.quantity,
    unit_price_cents: Math.round(v.unitPrice * 100),
    position,
  });
  if (error) return { error: error.message };

  await refreshInvoiceTotals(supabase, v.invoiceId);
  revalidatePath(`/catering/invoices/${v.invoiceId}`);
  return { ok: true };
}

const updateLineSchema = lineSchema.extend({ id: z.string().uuid() });

export async function updateInvoiceLine(
  raw: z.input<typeof updateLineSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = updateLineSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { error } = await supabase
    .from("catering_invoice_line_items")
    .update({
      name: v.name,
      description: v.description || null,
      unit: v.unit || "each",
      quantity: v.quantity,
      unit_price_cents: Math.round(v.unitPrice * 100),
      menu_item_id: v.menuItemId ?? null,
    })
    .eq("id", v.id);
  if (error) return { error: error.message };

  await refreshInvoiceTotals(supabase, v.invoiceId);
  revalidatePath(`/catering/invoices/${v.invoiceId}`);
  return { ok: true };
}

export async function deleteInvoiceLine(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_invoice_line_items")
    .select("invoice_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_invoice_line_items")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    await refreshInvoiceTotals(supabase, existing.invoice_id);
    revalidatePath(`/catering/invoices/${existing.invoice_id}`);
  }
  return { ok: true };
}

const bulkSchema = z.object({
  invoiceId: z.string().uuid(),
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().min(0).max(1_000_000).default(1),
      }),
    )
    .min(1)
    .max(200),
});

export async function addInvoiceItemsFromMenu(
  raw: z.input<typeof bulkSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = bulkSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const menuIds = v.items.map((i) => i.menuItemId);
  const { data: menuItems } = await supabase
    .from("catering_menu_items")
    .select("id, name, description, unit, price_cents")
    .in("id", menuIds);
  const byId = new Map(
    (menuItems ?? []).map((m) => [m.id as string, m]) as Array<
      [string, { id: string; name: string; description: string | null; unit: string; price_cents: number }]
    >,
  );

  const { data: max } = await supabase
    .from("catering_invoice_line_items")
    .select("position")
    .eq("invoice_id", v.invoiceId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = (max?.position ?? -1) + 1;

  const rows: Array<Record<string, unknown>> = [];
  for (const it of v.items) {
    const mi = byId.get(it.menuItemId);
    if (!mi) continue;
    rows.push({
      invoice_id: v.invoiceId,
      menu_item_id: mi.id,
      name: mi.name,
      description: mi.description,
      unit: mi.unit,
      quantity: it.quantity,
      unit_price_cents: mi.price_cents,
      position: position++,
    });
  }
  if (rows.length === 0) return { error: "No valid menu items" };

  const { error } = await supabase
    .from("catering_invoice_line_items")
    .insert(rows);
  if (error) return { error: error.message };

  await refreshInvoiceTotals(supabase, v.invoiceId);
  revalidatePath(`/catering/invoices/${v.invoiceId}`);
  return { ok: true };
}

// =============================================================================
// Payment recording (manual entry; Stripe webhooks come in Phase D).
// Creates an event_payment row, optionally linked to an existing event; if no
// event exists yet, a bare payment is still recorded against the invoice.
// =============================================================================
const paymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().min(0).max(10_000_000),
  kind: z.enum(["deposit", "balance", "refund", "gratuity"]),
  method: z.enum(["cash", "check", "card", "ach", "other"]).optional().nullable(),
  reference: stringy.max(200).optional().nullable(),
  notes: stringy.max(2000).optional().nullable(),
  paidAt: stringy.optional().nullable(),
});

export async function recordInvoicePayment(
  raw: z.input<typeof paymentSchema>,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: invoice } = await supabase
    .from("catering_invoices")
    .select("id, event_id, location_id, invoice_number")
    .eq("id", v.invoiceId)
    .maybeSingle();
  if (!invoice) return { error: "Invoice not found" };

  if (!invoice.event_id) {
    return {
      error:
        "Invoice has no linked event. Link to an event before recording a payment.",
    };
  }

  const { error } = await supabase.from("event_payments").insert({
    created_by: user.id,
    recorded_by: user.id,
    event_id: invoice.event_id,
    invoice_id: invoice.id,
    kind: v.kind,
    status: v.kind === "refund" ? "refunded" : "received",
    method: v.method ?? null,
    amount_cents: Math.round(v.amount * 100),
    reference: v.reference || null,
    notes: v.notes || null,
    paid_at: v.paidAt
      ? new Date(v.paidAt).toISOString()
      : new Date().toISOString(),
  });
  if (error) return { error: error.message };

  await refreshInvoiceAmountPaid(supabase, v.invoiceId);

  await logActivity({
    verb: v.kind === "refund" ? "refunded" : "paid",
    objectType: "catering_invoice",
    objectId: invoice.id,
    summary: `${invoice.invoice_number}: ${v.kind} ${(v.amount).toFixed(2)}`,
    locationId: invoice.location_id,
    metadata: { kind: v.kind, amount: v.amount },
  });

  revalidatePath(`/catering/invoices/${v.invoiceId}`);
  revalidatePath("/catering/billing");
  return { ok: true };
}

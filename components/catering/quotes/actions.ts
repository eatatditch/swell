"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import {
  SERVICE_TYPES,
  computeTotals,
} from "@/lib/constants/catering";
import type { SupabaseClient } from "@supabase/supabase-js";

const stringy = z.string().trim();

// =============================================================================
// Internal: recompute totals from current line items + parent rates/discount.
// =============================================================================
async function refreshQuoteTotals(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  quoteId: string,
) {
  const { data: quote } = await supabase
    .from("catering_quotes")
    .select("discount_cents, tax_rate_bps, gratuity_rate_bps")
    .eq("id", quoteId)
    .single();
  if (!quote) return;

  const { data: lines } = await supabase
    .from("catering_quote_line_items")
    .select("total_cents")
    .eq("quote_id", quoteId);

  const totals = computeTotals({
    lines: ((lines ?? []) as { total_cents: number }[]).map((l) => ({
      total_cents: l.total_cents,
    })),
    discount_cents: quote.discount_cents,
    tax_rate_bps: quote.tax_rate_bps,
    gratuity_rate_bps: quote.gratuity_rate_bps,
  });

  await supabase
    .from("catering_quotes")
    .update({
      subtotal_cents: totals.subtotal_cents,
      tax_cents: totals.tax_cents,
      gratuity_cents: totals.gratuity_cents,
      total_cents: totals.total_cents,
    })
    .eq("id", quoteId);
}

// =============================================================================
// Quote create / update / delete
// =============================================================================
const quoteSchema = z.object({
  contactId: z.string().uuid(),
  leadId: z.string().uuid().optional().nullable(),
  eventId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  title: stringy.min(1).max(200),
  eventDate: stringy.max(32).optional().nullable(),
  guestCount: z.number().int().min(0).max(100_000).optional().nullable(),
  serviceType: z.enum(SERVICE_TYPES as [string, ...string[]]).optional().nullable(),
  customerNotes: stringy.max(10_000).optional().nullable(),
  internalNotes: stringy.max(10_000).optional().nullable(),
  validUntil: stringy.max(32).optional().nullable(),
  taxRateBps: z.number().int().min(0).max(100_000).optional().default(0),
  gratuityRateBps: z.number().int().min(0).max(100_000).optional().default(0),
  discount: z.number().min(0).max(10_000_000).optional().default(0),
  depositRequired: z.number().min(0).max(10_000_000).optional().default(0),
});

export type CreateQuoteInput = z.input<typeof quoteSchema>;

export async function createQuote(raw: CreateQuoteInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = quoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_quotes")
    .insert({
      created_by: user.id,
      contact_id: v.contactId,
      lead_id: v.leadId ?? null,
      event_id: v.eventId ?? null,
      location_id: v.locationId ?? null,
      title: v.title,
      event_date: v.eventDate || null,
      guest_count: v.guestCount ?? null,
      service_type: v.serviceType ?? null,
      customer_notes: v.customerNotes || null,
      internal_notes: v.internalNotes || null,
      valid_until: v.validUntil || null,
      tax_rate_bps: v.taxRateBps ?? 0,
      gratuity_rate_bps: v.gratuityRateBps ?? 0,
      discount_cents: Math.round((v.discount ?? 0) * 100),
      deposit_required_cents: Math.round((v.depositRequired ?? 0) * 100),
    })
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create quote" };

  await logActivity({
    verb: "created",
    objectType: "catering_quote",
    objectId: data.id,
    summary: `${data.quote_number}: ${data.title}`,
    locationId: data.location_id,
  });

  revalidatePath("/catering/quotes");
  return { quote: data };
}

const updateQuoteSchema = quoteSchema.extend({ id: z.string().uuid() });

export async function updateQuote(raw: z.input<typeof updateQuoteSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = updateQuoteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("catering_quotes")
    .update({
      contact_id: v.contactId,
      lead_id: v.leadId ?? null,
      event_id: v.eventId ?? null,
      location_id: v.locationId ?? null,
      title: v.title,
      event_date: v.eventDate || null,
      guest_count: v.guestCount ?? null,
      service_type: v.serviceType ?? null,
      customer_notes: v.customerNotes || null,
      internal_notes: v.internalNotes || null,
      valid_until: v.validUntil || null,
      tax_rate_bps: v.taxRateBps ?? 0,
      gratuity_rate_bps: v.gratuityRateBps ?? 0,
      discount_cents: Math.round((v.discount ?? 0) * 100),
      deposit_required_cents: Math.round((v.depositRequired ?? 0) * 100),
    })
    .eq("id", v.id)
    .select("*")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update quote" };

  await refreshQuoteTotals(supabase, v.id);
  revalidatePath(`/catering/quotes/${v.id}`);
  revalidatePath("/catering/quotes");
  return { ok: true };
}

export async function deleteQuote(id: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("catering_quotes").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/catering/quotes");
  return { ok: true };
}

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "draft",
    "sent",
    "accepted",
    "declined",
    "expired",
    "converted",
  ]),
  declineReason: z.string().max(2000).optional().nullable(),
});

export async function setQuoteStatus(
  raw: z.input<typeof statusSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const update: Record<string, unknown> = { status: v.status };
  const now = new Date().toISOString();
  if (v.status === "sent") update.sent_at = now;
  if (v.status === "accepted") update.accepted_at = now;
  if (v.status === "declined") {
    update.declined_at = now;
    update.decline_reason = v.declineReason ?? null;
  }

  const { data, error } = await supabase
    .from("catering_quotes")
    .update(update)
    .eq("id", v.id)
    .select("id, quote_number, location_id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not update" };

  await logActivity({
    verb: v.status,
    objectType: "catering_quote",
    objectId: data.id,
    summary: data.quote_number,
    locationId: data.location_id,
    metadata: { status: v.status },
  });

  revalidatePath(`/catering/quotes/${v.id}`);
  revalidatePath("/catering/quotes");
  return { ok: true };
}

// =============================================================================
// Send quote: mint accept_token, build the email body with the public URL,
// send via the caller's connected Gmail, flip status to sent.
// =============================================================================
const sendQuoteSchema = z.object({
  id: z.string().uuid(),
  message: stringy.max(20_000).optional().nullable(),
});

export async function sendQuoteEmail(raw: z.input<typeof sendQuoteSchema>) {
  const { randomBytes } = await import("node:crypto");
  const { createSupabaseAdminClient } = await import(
    "@/lib/supabase/admin-server"
  );
  const { sendGmailMessage } = await import("@/lib/google/gmail");
  const { recordOutboundMessage } = await import(
    "@/lib/server/email-sync"
  );
  const { appUrl } = await import("@/lib/stripe/client");
  const { formatCents } = await import("@/lib/constants/catering");

  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = sendQuoteSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();
  if (!account) {
    return {
      error:
        "Connect Gmail in /catering/integrations before sending quotes.",
    };
  }

  const { data: quote } = await admin
    .from("catering_quotes")
    .select(
      "id, quote_number, title, event_date, total_cents, deposit_required_cents, accept_token, status, lead_id, location_id, contact:catering_contacts!catering_quotes_contact_id_fkey(id, full_name, email)",
    )
    .eq("id", v.id)
    .maybeSingle();
  if (!quote) return { error: "Quote not found" };

  const contact = (
    quote as unknown as {
      contact: { id: string; full_name: string; email: string | null } | null;
    }
  ).contact;
  if (!contact?.email) {
    return { error: "Quote contact has no email address on file" };
  }

  // Mint the accept_token lazily so resending uses the same public URL.
  let acceptToken = quote.accept_token as string | null;
  if (!acceptToken) {
    acceptToken = randomBytes(20).toString("base64url");
    await admin
      .from("catering_quotes")
      .update({ accept_token: acceptToken })
      .eq("id", quote.id);
  }

  const host = appUrl().replace(/\/$/, "");
  const publicUrl = `${host}/q/${encodeURIComponent(acceptToken)}`;

  const greeting = contact.full_name.split(/\s+/)[0];
  const body =
    v.message?.trim() ||
    [
      `Hi ${greeting},`,
      ``,
      `Here's your catering quote for "${quote.title}"${quote.event_date ? ` on ${new Date(quote.event_date).toLocaleDateString()}` : ""}.`,
      ``,
      `Total: ${formatCents(quote.total_cents)}`,
      `Non-refundable deposit to confirm: ${formatCents(quote.deposit_required_cents || 50000)}`,
      ``,
      `Review and accept here:`,
      publicUrl,
      ``,
      `Reply with any questions — we're happy to tweak the package.`,
    ].join("\n");

  let sent;
  try {
    sent = await sendGmailMessage({
      account,
      to: contact.email,
      subject: `Catering quote ${quote.quote_number} — ${quote.title}`,
      bodyText: body,
    });
  } catch (err) {
    console.error("[send-quote-email] gmail send failed:", err);
    const msg = err instanceof Error ? err.message : "Could not send email";
    return { error: msg };
  }

  await recordOutboundMessage({
    account,
    messageId: sent.id,
    threadId: sent.threadId,
    to: contact.email,
    subject: `Catering quote ${quote.quote_number} — ${quote.title}`,
    bodyText: body,
    bodyHtml: null,
    leadId: quote.lead_id ?? null,
    contactId: contact.id,
  });

  const now = new Date().toISOString();
  await admin
    .from("catering_quotes")
    .update({
      status: "sent",
      sent_at: now,
    })
    .eq("id", quote.id);

  await logActivity({
    verb: "sent",
    objectType: "catering_quote",
    objectId: quote.id,
    summary: `${quote.quote_number} → ${contact.email}`,
    locationId: quote.location_id,
  });

  revalidatePath(`/catering/quotes/${quote.id}`);
  return { ok: true, publicUrl };
}

// =============================================================================
// Quote line items
// =============================================================================
const lineSchema = z.object({
  quoteId: z.string().uuid(),
  name: stringy.min(1).max(200),
  description: stringy.max(2000).optional().nullable(),
  unit: stringy.max(64).optional().default("each"),
  quantity: z.number().min(0).max(1_000_000),
  unitPrice: z.number().min(0).max(10_000_000),
  menuItemId: z.string().uuid().optional().nullable(),
});

export async function addQuoteLine(raw: z.input<typeof lineSchema>) {
  const supabase = createSupabaseServerClient();
  const parsed = lineSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: max } = await supabase
    .from("catering_quote_line_items")
    .select("position")
    .eq("quote_id", v.quoteId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  const position = (max?.position ?? -1) + 1;

  const { error } = await supabase.from("catering_quote_line_items").insert({
    quote_id: v.quoteId,
    menu_item_id: v.menuItemId ?? null,
    name: v.name,
    description: v.description || null,
    unit: v.unit || "each",
    quantity: v.quantity,
    unit_price_cents: Math.round(v.unitPrice * 100),
    position,
  });
  if (error) return { error: error.message };

  await refreshQuoteTotals(supabase, v.quoteId);
  revalidatePath(`/catering/quotes/${v.quoteId}`);
  return { ok: true };
}

const updateLineSchema = lineSchema.extend({ id: z.string().uuid() });

export async function updateQuoteLine(
  raw: z.input<typeof updateLineSchema>,
) {
  const supabase = createSupabaseServerClient();
  const parsed = updateLineSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { error } = await supabase
    .from("catering_quote_line_items")
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

  await refreshQuoteTotals(supabase, v.quoteId);
  revalidatePath(`/catering/quotes/${v.quoteId}`);
  return { ok: true };
}

export async function deleteQuoteLine(id: string) {
  const supabase = createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("catering_quote_line_items")
    .select("quote_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("catering_quote_line_items")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  if (existing) {
    await refreshQuoteTotals(supabase, existing.quote_id);
    revalidatePath(`/catering/quotes/${existing.quote_id}`);
  }
  return { ok: true };
}

// Bulk-add items from the menu library at once.
const bulkSchema = z.object({
  quoteId: z.string().uuid(),
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

export async function addItemsFromMenu(raw: z.input<typeof bulkSchema>) {
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
    .from("catering_quote_line_items")
    .select("position")
    .eq("quote_id", v.quoteId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();
  let position = (max?.position ?? -1) + 1;

  const rows: Array<Record<string, unknown>> = [];
  for (const it of v.items) {
    const mi = byId.get(it.menuItemId);
    if (!mi) continue;
    rows.push({
      quote_id: v.quoteId,
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
    .from("catering_quote_line_items")
    .insert(rows);
  if (error) return { error: error.message };

  await refreshQuoteTotals(supabase, v.quoteId);
  revalidatePath(`/catering/quotes/${v.quoteId}`);
  return { ok: true };
}

// =============================================================================
// Convert quote → invoice
// =============================================================================
const convertSchema = z.object({
  quoteId: z.string().uuid(),
  dueDate: stringy.max(32).optional().nullable(),
});

export async function convertQuoteToInvoice(
  raw: z.input<typeof convertSchema>,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = convertSchema.safeParse(raw);
  if (!parsed.success) return { error: "Invalid input" };
  const v = parsed.data;

  const { data: quote } = await supabase
    .from("catering_quotes")
    .select("*")
    .eq("id", v.quoteId)
    .maybeSingle();
  if (!quote) return { error: "Quote not found" };
  if (quote.converted_invoice_id) {
    return {
      invoice: { id: quote.converted_invoice_id as string },
      alreadyLinked: true,
    };
  }

  const { data: invoice, error: invErr } = await supabase
    .from("catering_invoices")
    .insert({
      created_by: user.id,
      contact_id: quote.contact_id,
      quote_id: quote.id,
      event_id: quote.event_id,
      location_id: quote.location_id,
      title: quote.title,
      due_date: v.dueDate || null,
      customer_notes: quote.customer_notes,
      internal_notes: quote.internal_notes,
      tax_rate_bps: quote.tax_rate_bps,
      gratuity_rate_bps: quote.gratuity_rate_bps,
      discount_cents: quote.discount_cents,
    })
    .select("*")
    .single();
  if (invErr || !invoice) {
    return { error: invErr?.message ?? "Could not create invoice" };
  }

  const { data: lines } = await supabase
    .from("catering_quote_line_items")
    .select("menu_item_id, name, description, unit, quantity, unit_price_cents, position")
    .eq("quote_id", quote.id)
    .order("position");
  if (lines && lines.length > 0) {
    const rows = lines.map((l) => ({
      invoice_id: invoice.id,
      menu_item_id: l.menu_item_id,
      name: l.name,
      description: l.description,
      unit: l.unit,
      quantity: l.quantity,
      unit_price_cents: l.unit_price_cents,
      position: l.position,
    }));
    await supabase.from("catering_invoice_line_items").insert(rows);
  }

  // Mark quote converted; backreference invoice.
  await supabase
    .from("catering_quotes")
    .update({
      status: "converted",
      converted_invoice_id: invoice.id,
    })
    .eq("id", quote.id);

  // Recompute invoice totals.
  await refreshInvoiceTotals(supabase, invoice.id);

  await logActivity({
    verb: "converted",
    objectType: "catering_quote",
    objectId: quote.id,
    summary: `${quote.quote_number} → ${invoice.invoice_number}`,
    locationId: quote.location_id,
    metadata: { invoice_id: invoice.id },
  });

  revalidatePath("/catering/quotes");
  revalidatePath("/catering/invoices");
  revalidatePath(`/catering/quotes/${quote.id}`);
  return { invoice };
}

// Mirror of refreshQuoteTotals for invoices. Kept here so the conversion
// action is self-contained.
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

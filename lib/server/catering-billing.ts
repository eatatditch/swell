import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CateringContact,
  CateringInvoice,
  CateringInvoiceLineItem,
  CateringInvoiceStatus,
  CateringQuote,
  CateringQuoteLineItem,
  CateringQuoteStatus,
  Location,
} from "@/lib/types/database";

export type QuoteWithContact = CateringQuote & {
  contact: Pick<CateringContact, "id" | "full_name" | "company"> | null;
  location: Pick<Location, "id" | "name" | "slug"> | null;
};

export type InvoiceWithContact = CateringInvoice & {
  contact: Pick<CateringContact, "id" | "full_name" | "company"> | null;
  location: Pick<Location, "id" | "name" | "slug"> | null;
};

export type FullQuote = QuoteWithContact & {
  lines: CateringQuoteLineItem[];
};

export type FullInvoice = InvoiceWithContact & {
  lines: CateringInvoiceLineItem[];
};

const QUOTE_SELECT =
  "*, contact:catering_contacts!catering_quotes_contact_id_fkey(id, full_name, company), location:locations(id, name, slug)";

const INVOICE_SELECT =
  "*, contact:catering_contacts!catering_invoices_contact_id_fkey(id, full_name, company), location:locations(id, name, slug)";

export async function listQuotes(opts: {
  locationId?: string | null;
  status?: CateringQuoteStatus | "all";
  contactId?: string | null;
  search?: string;
}): Promise<QuoteWithContact[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("catering_quotes")
    .select(QUOTE_SELECT)
    .order("created_at", { ascending: false });

  if (opts.locationId) query = query.eq("location_id", opts.locationId);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  if (opts.contactId) query = query.eq("contact_id", opts.contactId);
  if (opts.search && opts.search.trim()) {
    const s = `%${opts.search.trim()}%`;
    query = query.or(`quote_number.ilike.${s},title.ilike.${s}`);
  }

  const { data } = await query;
  return (data ?? []) as QuoteWithContact[];
}

export async function getQuoteFull(id: string): Promise<FullQuote | null> {
  const supabase = createSupabaseServerClient();
  const [quoteResp, linesResp] = await Promise.all([
    supabase.from("catering_quotes").select(QUOTE_SELECT).eq("id", id).maybeSingle(),
    supabase
      .from("catering_quote_line_items")
      .select("*")
      .eq("quote_id", id)
      .order("position", { ascending: true }),
  ]);
  if (!quoteResp.data) return null;
  return {
    ...(quoteResp.data as QuoteWithContact),
    lines: (linesResp.data ?? []) as CateringQuoteLineItem[],
  };
}

export async function listInvoices(opts: {
  locationId?: string | null;
  status?: CateringInvoiceStatus | "all";
  contactId?: string | null;
  search?: string;
}): Promise<InvoiceWithContact[]> {
  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("catering_invoices")
    .select(INVOICE_SELECT)
    .order("created_at", { ascending: false });

  if (opts.locationId) query = query.eq("location_id", opts.locationId);
  if (opts.status && opts.status !== "all") query = query.eq("status", opts.status);
  if (opts.contactId) query = query.eq("contact_id", opts.contactId);
  if (opts.search && opts.search.trim()) {
    const s = `%${opts.search.trim()}%`;
    query = query.or(`invoice_number.ilike.${s},title.ilike.${s}`);
  }

  const { data } = await query;
  return (data ?? []) as InvoiceWithContact[];
}

export async function getInvoiceFull(id: string): Promise<FullInvoice | null> {
  const supabase = createSupabaseServerClient();
  const [invoiceResp, linesResp] = await Promise.all([
    supabase
      .from("catering_invoices")
      .select(INVOICE_SELECT)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("catering_invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("position", { ascending: true }),
  ]);
  if (!invoiceResp.data) return null;
  return {
    ...(invoiceResp.data as InvoiceWithContact),
    lines: (linesResp.data ?? []) as CateringInvoiceLineItem[],
  };
}

// =============================================================================
// Billing dashboard
// =============================================================================
export interface BillingSummary {
  outstandingCents: number;
  overdueCents: number;
  paidThisMonthCents: number;
  draftCount: number;
  sentCount: number;
  overdueCount: number;
}

export async function getBillingSummary(opts: {
  locationId?: string | null;
}): Promise<BillingSummary> {
  const supabase = createSupabaseServerClient();
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartISO = monthStart.toISOString().slice(0, 10);

  let invoicesQuery = supabase
    .from("catering_invoices")
    .select("id, status, total_cents, amount_paid_cents, due_date, paid_at, location_id");
  if (opts.locationId) {
    invoicesQuery = invoicesQuery.eq("location_id", opts.locationId);
  }

  const { data: invoices } = await invoicesQuery;
  const rows = (invoices ?? []) as Array<{
    status: CateringInvoiceStatus;
    total_cents: number;
    amount_paid_cents: number;
    due_date: string | null;
    paid_at: string | null;
  }>;

  let outstandingCents = 0;
  let overdueCents = 0;
  let paidThisMonthCents = 0;
  let draftCount = 0;
  let sentCount = 0;
  let overdueCount = 0;

  for (const r of rows) {
    const balance = Math.max(0, r.total_cents - r.amount_paid_cents);
    if (r.status === "draft") {
      draftCount += 1;
    } else if (r.status === "sent" || r.status === "partially_paid") {
      sentCount += 1;
      outstandingCents += balance;
      if (r.due_date && r.due_date < today) {
        overdueCents += balance;
        overdueCount += 1;
      }
    } else if (r.status === "overdue") {
      overdueCount += 1;
      overdueCents += balance;
      outstandingCents += balance;
    }
    if (
      (r.status === "paid" || r.status === "partially_paid") &&
      r.paid_at &&
      r.paid_at.slice(0, 10) >= monthStartISO
    ) {
      paidThisMonthCents += r.amount_paid_cents;
    }
  }

  return {
    outstandingCents,
    overdueCents,
    paidThisMonthCents,
    draftCount,
    sentCount,
    overdueCount,
  };
}

import { notFound } from "next/navigation";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { PublicQuoteView } from "@/components/catering/quotes/public-quote-view";
import { formatCents, formatEventDate } from "@/lib/constants/catering";
import type {
  CateringQuote,
  CateringQuoteLineItem,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface PageProps {
  params: { token: string };
  searchParams: { canceled?: string };
}

interface PublicQuote
  extends Pick<
    CateringQuote,
    | "id"
    | "quote_number"
    | "title"
    | "event_date"
    | "guest_count"
    | "service_type"
    | "customer_notes"
    | "subtotal_cents"
    | "discount_cents"
    | "tax_cents"
    | "gratuity_cents"
    | "total_cents"
    | "deposit_required_cents"
    | "valid_until"
    | "accepted_at"
    | "declined_at"
    | "deposit_paid_at"
    | "decline_reason"
  > {
  contact: { full_name: string; company: string | null } | null;
  location: { name: string } | null;
  lines: CateringQuoteLineItem[];
}

export default async function PublicQuotePage({
  params,
  searchParams,
}: PageProps) {
  const token = params.token;
  if (!token) notFound();

  const admin = createSupabaseAdminClient();
  const { data: quote } = await admin
    .from("catering_quotes")
    .select(
      `id, quote_number, title, event_date, guest_count, service_type,
       customer_notes, subtotal_cents, discount_cents, tax_cents,
       gratuity_cents, total_cents, deposit_required_cents, valid_until,
       accepted_at, declined_at, deposit_paid_at, decline_reason,
       contact:catering_contacts!catering_quotes_contact_id_fkey(full_name, company),
       location:locations(name)`,
    )
    .eq("accept_token", token)
    .maybeSingle();

  if (!quote) notFound();

  const { data: lines } = await admin
    .from("catering_quote_line_items")
    .select("*")
    .eq("quote_id", quote.id)
    .order("position", { ascending: true });

  const full = {
    ...(quote as unknown as PublicQuote),
    lines: (lines ?? []) as CateringQuoteLineItem[],
  };

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <PublicQuoteView
          quote={full}
          token={token}
          canceled={searchParams.canceled === "1"}
          formattedTotals={{
            subtotal: formatCents(full.subtotal_cents),
            discount:
              full.discount_cents > 0 ? formatCents(full.discount_cents) : null,
            tax: full.tax_cents > 0 ? formatCents(full.tax_cents) : null,
            gratuity:
              full.gratuity_cents > 0 ? formatCents(full.gratuity_cents) : null,
            total: formatCents(full.total_cents),
            deposit: formatCents(full.deposit_required_cents || 50000),
          }}
          formattedDate={full.event_date ? formatEventDate(full.event_date) : null}
        />
      </div>
    </main>
  );
}

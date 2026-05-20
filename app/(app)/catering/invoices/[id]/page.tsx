import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { InvoiceStatusBadge } from "@/components/catering/status-badges";
import { InvoiceBuilder } from "@/components/catering/invoices/invoice-builder";
import { requireUser } from "@/lib/auth/get-user";
import { getInvoiceFull } from "@/lib/server/catering-billing";
import { listMenus, getMenuFull } from "@/lib/server/catering-menus";
import { listPayments } from "@/lib/server/catering";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatEventDate } from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  await requireUser();
  const invoice = await getInvoiceFull(params.id);
  if (!invoice) notFound();

  const [menuStubs, payments] = await Promise.all([
    listMenus({ includeArchived: false }),
    invoice.event_id ? listInvoicePayments(invoice.id) : Promise.resolve([]),
  ]);
  const menus = (
    await Promise.all(menuStubs.map((m) => getMenuFull(m.id)))
  ).filter((m): m is NonNullable<typeof m> => m !== null);

  return (
    <>
      <PageHeader
        title={`${invoice.invoice_number} · ${invoice.title}`}
        description={
          invoice.contact
            ? `${invoice.contact.full_name}${invoice.contact.company ? ` · ${invoice.contact.company}` : ""}${invoice.due_date ? ` · due ${formatEventDate(invoice.due_date)}` : ""}`
            : undefined
        }
        action={<InvoiceStatusBadge status={invoice.status} />}
      />

      <InvoiceBuilder invoice={invoice} menus={menus} payments={payments} />
    </>
  );
}

async function listInvoicePayments(invoiceId: string) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("event_payments")
    .select(
      "*, recorder:profiles!event_payments_recorded_by_fkey(id, full_name, email, avatar_url)",
    )
    .eq("invoice_id", invoiceId)
    .order("paid_at", { ascending: false });
  return (data ?? []) as Awaited<ReturnType<typeof listPayments>>;
}

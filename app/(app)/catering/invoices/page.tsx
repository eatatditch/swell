import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InvoiceList } from "@/components/catering/invoices/invoice-list";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { listInvoices } from "@/lib/server/catering-billing";
import {
  INVOICE_STATUSES,
  INVOICE_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { CateringInvoiceStatus } from "@/lib/types/database";

interface PageProps {
  searchParams: { q?: string; status?: string; location?: string };
}

export default async function InvoicesPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const filterLocationId = searchParams.location || active?.id || "";
  const status = (
    searchParams.status &&
    INVOICE_STATUSES.includes(searchParams.status as CateringInvoiceStatus)
      ? searchParams.status
      : "all"
  ) as CateringInvoiceStatus | "all";

  const invoices = await listInvoices({
    locationId: filterLocationId || null,
    status,
    search: searchParams.q ?? "",
  });

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Issued and outstanding invoices."
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <Input
          name="q"
          defaultValue={searchParams.q ?? ""}
          placeholder="Search invoice # or title…"
          className="h-9 max-w-xs"
        />
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="all">All statuses</option>
          {INVOICE_STATUSES.map((s) => (
            <option key={s} value={s}>
              {INVOICE_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
      </form>

      <InvoiceList invoices={invoices} />
    </>
  );
}

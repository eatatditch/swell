import Link from "next/link";
import {
  AlertTriangle,
  DollarSign,
  FileText,
  Wallet,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InvoiceList } from "@/components/catering/invoices/invoice-list";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import {
  getBillingSummary,
  listInvoices,
} from "@/lib/server/catering-billing";
import { formatCents } from "@/lib/constants/catering";

export default async function BillingPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const locationId = active?.id ?? null;

  const [summary, outstanding] = await Promise.all([
    getBillingSummary({ locationId }),
    listInvoices({ locationId, status: "all" }).then((rows) =>
      rows.filter(
        (i) =>
          i.status === "sent" ||
          i.status === "partially_paid" ||
          i.status === "overdue",
      ),
    ),
  ]);

  return (
    <>
      <PageHeader
        title="Billing"
        description={
          active
            ? `Outstanding and recent invoices at ${active.name}.`
            : "Outstanding and recent invoices across locations."
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Wallet}
          label="Outstanding"
          value={formatCents(summary.outstandingCents)}
        />
        <Stat
          icon={AlertTriangle}
          label="Overdue"
          value={formatCents(summary.overdueCents)}
          tone={summary.overdueCents > 0 ? "warn" : "default"}
        />
        <Stat
          icon={DollarSign}
          label="Paid this month"
          value={formatCents(summary.paidThisMonthCents)}
        />
        <Stat
          icon={FileText}
          label="Open invoices"
          value={`${summary.sentCount + summary.overdueCount}`}
          subtitle={`${summary.draftCount} drafts`}
        />
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Outstanding</h2>
          <Link
            href="/catering/invoices"
            className="text-xs font-medium text-accent hover:underline"
          >
            View all invoices →
          </Link>
        </div>
        <InvoiceList invoices={outstanding} />
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  subtitle,
  tone = "default",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <Icon
          className={
            tone === "warn"
              ? "h-4 w-4 text-rose-600"
              : "h-4 w-4 text-muted-foreground"
          }
        />
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-2xl font-bold tabular-nums">
          {value}
        </p>
        {subtitle ? (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

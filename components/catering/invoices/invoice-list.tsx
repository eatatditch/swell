import Link from "next/link";
import { Receipt } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { InvoiceStatusBadge } from "@/components/catering/status-badges";
import {
  formatCents,
  formatEventDate,
} from "@/lib/constants/catering";
import type { InvoiceWithContact } from "@/lib/server/catering-billing";

export function InvoiceList({
  invoices,
}: {
  invoices: InvoiceWithContact[];
}) {
  if (invoices.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No invoices yet"
        description="Convert an accepted quote or create one from scratch."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Due</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-right">Balance</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map((inv) => (
            <tr
              key={inv.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {inv.invoice_number}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/catering/invoices/${inv.id}`}
                  className="font-medium hover:text-accent"
                >
                  {inv.contact?.full_name ?? "—"}
                </Link>
                {inv.contact?.company ? (
                  <p className="text-xs text-muted-foreground">
                    {inv.contact.company}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                {inv.title}
                {inv.location ? (
                  <p className="text-xs text-muted-foreground">
                    {inv.location.name}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {inv.due_date ? formatEventDate(inv.due_date) : "—"}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCents(inv.total_cents)}
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCents(inv.balance_cents)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={inv.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

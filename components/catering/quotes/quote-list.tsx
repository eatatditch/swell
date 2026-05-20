import Link from "next/link";
import { FileText } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { QuoteStatusBadge } from "@/components/catering/status-badges";
import {
  formatCents,
  formatEventDate,
} from "@/lib/constants/catering";
import type { QuoteWithContact } from "@/lib/server/catering-billing";

export function QuoteList({ quotes }: { quotes: QuoteWithContact[] }) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No quotes yet"
        description="Build a quote, send it to the customer, then convert to an invoice once it's accepted."
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
            <th className="px-4 py-3">Event</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {quotes.map((q) => (
            <tr
              key={q.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                {q.quote_number}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={`/catering/quotes/${q.id}`}
                  className="font-medium hover:text-accent"
                >
                  {q.contact?.full_name ?? "—"}
                </Link>
                {q.contact?.company ? (
                  <p className="text-xs text-muted-foreground">
                    {q.contact.company}
                  </p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <p className="text-sm">{q.title}</p>
                <p className="text-xs text-muted-foreground">
                  {q.event_date ? formatEventDate(q.event_date) : "No date"}
                  {q.location ? ` · ${q.location.name}` : ""}
                </p>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">
                {formatCents(q.total_cents)}
              </td>
              <td className="px-4 py-3">
                <QuoteStatusBadge status={q.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

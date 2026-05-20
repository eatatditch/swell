import { CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatCents } from "@/lib/constants/catering";
import type { PaymentTotals } from "@/lib/server/catering";

export function PaymentSummary({ totals }: { totals: PaymentTotals }) {
  const paid = totals.received - totals.refunded;
  const balance = totals.balance;
  const settled = totals.quoted > 0 && balance === 0;

  return (
    <div className="space-y-2 rounded-2xl border bg-card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Payment
      </p>
      <Row label="Quoted" value={formatCents(totals.quoted)} />
      <Row label="Received" value={formatCents(paid)} accent />
      {totals.pending > 0 ? (
        <Row label="Pending" value={formatCents(totals.pending)} muted />
      ) : null}
      <div className="my-2 border-t" />
      <div
        className={cn(
          "flex items-center justify-between rounded-lg px-2 py-1.5",
          settled ? "bg-primary/10 text-primary" : "bg-muted",
        )}
      >
        <span className="text-sm font-medium">
          {settled ? "Paid in full" : "Balance"}
        </span>
        <span className="text-sm font-semibold tabular-nums">
          {settled ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {formatCents(0)}
            </span>
          ) : (
            formatCents(balance)
          )}
        </span>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn("text-muted-foreground", accent && "text-foreground")}>
        {label}
      </span>
      <span
        className={cn(
          "tabular-nums",
          accent && "font-semibold",
          muted && "text-muted-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

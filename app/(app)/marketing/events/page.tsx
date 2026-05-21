import { Calculator } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EVENTS, type EventRow } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function statusTone(s: EventRow["status"]): string {
  switch (s) {
    case "announced":
      return "bg-accent/15 text-accent";
    case "selling":
      return "bg-primary/15 text-primary";
    case "sold_out":
      return "bg-emerald-500/15 text-emerald-700";
    case "complete":
      return "bg-muted text-muted-foreground";
  }
}

function statusLabel(s: EventRow["status"]): string {
  switch (s) {
    case "sold_out":
      return "Sold out";
    default:
      return s.charAt(0).toUpperCase() + s.slice(1);
  }
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

export default function EventsPage() {
  return (
    <div>
      <PageHeader
        title="Events"
        description="Ticketed nights at each location — tastings, classes, watch parties. Sell-through is the metric."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {EVENTS.map((e) => {
          const revenue = e.sold * e.ticketPrice;
          const pct = e.capacity > 0 ? (e.sold / e.capacity) * 100 : 0;
          return (
            <Card key={e.name}>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      {e.type} · {e.location}
                    </div>
                    <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                      {e.name}
                    </h3>
                    <p className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                      {e.date}
                    </p>
                  </div>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(
                      e.status,
                    )}`}
                  >
                    {statusLabel(e.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Ticket
                    </div>
                    <div className="font-semibold tabular-nums text-foreground">
                      {e.ticketPrice > 0 ? usd(e.ticketPrice) : "Free"}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Revenue
                    </div>
                    <div className="font-semibold tabular-nums text-foreground">
                      {revenue > 0 ? usd(revenue) : "—"}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                    <span>Sold</span>
                    <span className="tabular-nums">
                      {e.sold} / {e.capacity}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6">
        <Card className="border-dashed bg-card/60">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
              <Calculator className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                Profitability calculator
              </h3>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Plug in cost per guest, labor, and marketing spend to estimate
                event margin. Placeholder — coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

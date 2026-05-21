import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  PRIVATE_EVENT_LEADS,
  type PrivateEventLead,
} from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function statusTone(s: PrivateEventLead["status"]): string {
  switch (s) {
    case "inquiry":
      return "bg-muted text-muted-foreground";
    case "quoted":
      return "bg-accent/15 text-accent";
    case "booked":
      return "bg-emerald-500/15 text-emerald-700";
    case "lost":
      return "bg-rose-500/10 text-rose-700";
  }
}

function usd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 font-display text-2xl font-black tabular-nums text-foreground">
          {value}
        </div>
        {sub ? (
          <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function PrivateEventsPage() {
  const total = PRIVATE_EVENT_LEADS.length;
  const quoted = PRIVATE_EVENT_LEADS.filter((l) => l.status === "quoted").length;
  const booked = PRIVATE_EVENT_LEADS.filter((l) => l.status === "booked").length;
  const pipeline = PRIVATE_EVENT_LEADS.filter(
    (l) => l.status !== "lost",
  ).reduce((sum, l) => sum + l.budget, 0);

  return (
    <div>
      <PageHeader
        title="Private Events"
        description="Showers, rehearsals, corporate buyouts. Track each lead from inquiry through booked."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Inquiries" value={String(total)} />
        <Kpi label="Quoted" value={String(quoted)} />
        <Kpi label="Booked" value={String(booked)} />
        <Kpi
          label="Pipeline value"
          value={usd(pipeline)}
          sub="Open leads only"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-t border-border">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Lead</th>
              <th className="px-3 py-2 font-medium">Event</th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 text-right font-medium">Guests</th>
              <th className="px-3 py-2 text-right font-medium">Budget</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Follow up</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {PRIVATE_EVENT_LEADS.map((l) => (
              <tr
                key={l.name + l.date}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-3 py-3 font-medium text-foreground">
                  {l.name}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{l.eventType}</td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {l.date}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {l.guests}
                </td>
                <td className="px-3 py-3 text-right tabular-nums text-foreground">
                  {usd(l.budget)}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{l.location}</td>
                <td className="px-3 py-3 text-muted-foreground">{l.source}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusTone(
                      l.status,
                    )}`}
                  >
                    {l.status}
                  </span>
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {l.followUp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

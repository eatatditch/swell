import { AlertTriangle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  EMAILS,
  SMSES,
  type EmailRow,
  type SmsRow,
} from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function emailStatusTone(s: EmailRow["status"]): string {
  switch (s) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "ready":
      return "bg-accent/15 text-accent";
    case "scheduled":
      return "bg-primary/15 text-primary";
    case "sent":
      return "bg-emerald-500/15 text-emerald-700";
  }
}

function smsStatusTone(s: SmsRow["status"]): string {
  switch (s) {
    case "draft":
      return "bg-muted text-muted-foreground";
    case "scheduled":
      return "bg-primary/15 text-primary";
    case "sent":
      return "bg-emerald-500/15 text-emerald-700";
  }
}

function formatRevenue(n: number | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatSendAt(s: string): string {
  return s.replace("T", " ");
}

// ISO week key for grouping by week
function weekKey(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return dateStr;
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

function findOverloadedWeeks(rows: SmsRow[]): string[] {
  const counts: Record<string, number> = {};
  for (const s of rows) {
    const k = weekKey(s.sendAt);
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts)
    .filter(([, c]) => c > 2)
    .map(([k]) => k);
}

export default function EmailSmsPage() {
  const overloadedWeeks = findOverloadedWeeks(SMSES);

  return (
    <div>
      <PageHeader
        title="Email & SMS"
        description="Outbound campaigns to Surf Club, segments, and lapsed guests. SMS frequency is rate-limited per guest."
      />

      {overloadedWeeks.length > 0 ? (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm">
              <div className="font-semibold text-amber-700">
                SMS frequency guardrail
              </div>
              <div className="mt-0.5 text-amber-700/90">
                More than 2 SMS are scheduled in the same week
                {overloadedWeeks.length > 1
                  ? "s"
                  : ""}{" "}
                ({overloadedWeeks.join(", ")}). Risk of opt-outs — consider
                staggering.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email">Email ({EMAILS.length})</TabsTrigger>
          <TabsTrigger value="sms">SMS ({SMSES.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-border">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Campaign</th>
                  <th className="px-3 py-2 font-medium">Subject</th>
                  <th className="px-3 py-2 font-medium">Segment</th>
                  <th className="px-3 py-2 font-medium">Send time</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {EMAILS.map((e) => (
                  <tr
                    key={e.name}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{e.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.campaign}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-foreground">{e.subject}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {e.segment}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-muted-foreground">
                      {formatSendAt(e.sendAt)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${emailStatusTone(
                          e.status,
                        )}`}
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {formatRevenue(e.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="sms">
          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-border">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium">Segment</th>
                  <th className="px-3 py-2 font-medium">Send time</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 text-right font-medium">Clicks</th>
                  <th className="px-3 py-2 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {SMSES.map((s, i) => {
                  const preview =
                    s.message.length > 80
                      ? s.message.slice(0, 80).trimEnd() + "…"
                      : s.message;
                  return (
                    <tr
                      key={i}
                      className="border-b border-border/70 last:border-0"
                    >
                      <td className="px-3 py-3">
                        <div className="text-foreground">{preview}</div>
                        <div className="mt-0.5 text-xs tabular-nums text-muted-foreground">
                          {s.message.length} chars
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {s.segment}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {formatSendAt(s.sendAt)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${smsStatusTone(
                            s.status,
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {s.clicks ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {formatRevenue(s.revenue)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

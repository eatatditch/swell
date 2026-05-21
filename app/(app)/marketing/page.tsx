import Link from "next/link";
import {
  ArrowRight,
  Compass,
  DollarSign,
  Flag,
  Heart,
  MessageCircle,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { formatMoney } from "@/lib/constants/marketing";
import {
  LOCATION_KPIS,
  NEXT_BEST_MOVE,
  TOP_LEVEL_KPIS,
  WEEK_FOCUS,
} from "@/lib/data/marketing-sample";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketingDashboardPage() {
  return (
    <>
      <PageHeader
        title="Marketing"
        description="Where every campaign, post, ad, email, and review lives."
        action={
          <Link
            href="/marketing/planner"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-soft"
          >
            <Compass className="h-4 w-4" />
            This week&apos;s plan
          </Link>
        }
      />

      <section className="mb-6">
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-accent" />
              Next best move
            </CardTitle>
            <CardDescription>
              The single biggest-leverage action right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="font-medium">{NEXT_BEST_MOVE.title}</p>
            <p className="text-sm text-muted-foreground">{NEXT_BEST_MOVE.why}</p>
            <div className="flex gap-2 pt-2">
              <Link
                href="/marketing/email-sms"
                className="inline-flex h-8 items-center gap-1 rounded-full bg-accent px-3 text-xs font-semibold text-accent-foreground hover:bg-accent-soft"
              >
                Open SMS planner <ArrowRight className="h-3 w-3" />
              </Link>
              <Link
                href="/marketing/assistant"
                className="inline-flex h-8 items-center gap-1 rounded-full border border-input bg-card px-3 text-xs font-semibold hover:bg-muted"
              >
                Ask Wave (AI) <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-bold">By location</h2>
        <div className="grid gap-3 lg:grid-cols-3">
          {LOCATION_KPIS.map((l) => {
            const pct = Math.round((l.weeklyActual / l.weeklyGoal) * 100);
            const ahead = l.weeklyActual >= l.weeklyGoal;
            return (
              <Card key={l.location}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{l.location}</CardTitle>
                  <CardDescription>
                    Goal {formatMoney(l.weeklyGoal * 100)} ·{" "}
                    {l.guestCount.toLocaleString()} guests
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-baseline justify-between">
                      <p className="text-2xl font-semibold tabular-nums">
                        {formatMoney(l.weeklyActual * 100)}
                      </p>
                      <p
                        className={cn(
                          "text-xs font-semibold",
                          ahead ? "text-emerald-700" : "text-rose-600",
                        )}
                      >
                        {ahead ? "+" : ""}
                        {pct - 100}% to goal
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full transition-all",
                          ahead ? "bg-emerald-500" : "bg-rose-500",
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Check avg</p>
                      <p className="font-semibold tabular-nums">
                        ${l.checkAverage.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Best daypart</p>
                      <p className="font-semibold">{l.bestDaypart}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">Worst daypart</p>
                      <p className="font-semibold">{l.worstDaypart}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 font-display text-lg font-bold">This week</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {TOP_LEVEL_KPIS.map((k) => (
            <KpiTile key={k.label} kpi={k} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Flag className="h-4 w-4 text-accent" />
              This week&apos;s marketing focus
            </CardTitle>
            <CardDescription>What we&apos;re pushing on, in order.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 text-sm">
              {WEEK_FOCUS.map((f, i) => (
                <li
                  key={f}
                  className="flex items-start gap-3 rounded-md border bg-card p-3"
                >
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <p className="flex-1">{f}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick jumps</CardTitle>
            <CardDescription>Get something done.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              <QuickLink href="/marketing/campaigns" label="Create a campaign" />
              <QuickLink href="/marketing/content" label="Open the content board" />
              <QuickLink href="/marketing/email-sms" label="Draft email / SMS" />
              <QuickLink href="/marketing/ads" label="Check Meta Ads tracker" />
              <QuickLink href="/marketing/reviews" label="Read fresh reviews" />
              <QuickLink href="/marketing/scorecard" label="Weekly scorecard" />
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function KpiTile({
  kpi,
}: {
  kpi: {
    label: string;
    value: string;
    delta?: string;
    tone?: "default" | "good" | "warn";
  };
}) {
  const Icon =
    kpi.tone === "good"
      ? TrendingUp
      : kpi.tone === "warn"
        ? TrendingDown
        : guessIcon(kpi.label);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {kpi.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-semibold tabular-nums">{kpi.value}</p>
        {kpi.delta ? (
          <p
            className={cn(
              "mt-0.5 text-xs",
              kpi.tone === "good"
                ? "text-emerald-700"
                : kpi.tone === "warn"
                  ? "text-rose-600"
                  : "text-muted-foreground",
            )}
          >
            {kpi.delta}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted"
      >
        <span>{label}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </Link>
    </li>
  );
}

function guessIcon(label: string) {
  if (/email|sms/i.test(label)) return MessageCircle;
  if (/club|signups|inquir|guest/i.test(label)) return Users;
  if (/ad|revenue|spend|ticket/i.test(label)) return DollarSign;
  if (/traffic|gbp/i.test(label)) return Compass;
  return Heart;
}

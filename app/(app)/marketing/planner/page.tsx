import { Calendar } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import {
  PLANNER_STATUS_LABELS,
  PLANNER_WEEK,
  type PlannerStatus,
} from "@/lib/data/marketing-sample";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketingPlannerPage() {
  const statusCounts = new Map<PlannerStatus, number>();
  for (const d of PLANNER_WEEK) {
    statusCounts.set(d.status, (statusCounts.get(d.status) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Weekly planner"
        description="The marketing week at a glance: one day at a time."
        action={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Week of May 18, 2026</span>
          </div>
        }
      />

      <section className="mb-6 flex flex-wrap gap-2">
        {(Object.keys(PLANNER_STATUS_LABELS) as PlannerStatus[]).map((s) => (
          <span
            key={s}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
              statusTone(s),
            )}
          >
            {PLANNER_STATUS_LABELS[s]}
            <span className="text-muted-foreground/70">
              ({statusCounts.get(s) ?? 0})
            </span>
          </span>
        ))}
      </section>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
        {PLANNER_WEEK.map((d) => (
          <Card key={d.date} className="flex flex-col">
            <CardHeader className="pb-2">
              <div className="flex items-baseline justify-between">
                <CardTitle className="text-base">{d.weekday}</CardTitle>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    statusTone(d.status),
                  )}
                >
                  {PLANNER_STATUS_LABELS[d.status]}
                </span>
              </div>
              <CardDescription>{d.date}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 text-sm">
              <Field label="Campaign" value={d.primaryCampaign} accent />
              <Field label="Content" value={d.content} />
              {d.emailSms ? (
                <Field label="Email / SMS" value={d.emailSms} />
              ) : null}
              <Field label="Ad priority" value={d.adPriority} />
              <Field label="Location" value={d.location} subtle />
              {d.notes ? (
                <Field label="Notes" value={d.notes} subtle />
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="mt-8 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
            <CardDescription>Slice by location.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {["Bay Shore", "Port Jefferson", "Kings Park", "All locations"].map(
              (l) => (
                <button
                  key={l}
                  type="button"
                  className="inline-flex h-7 items-center rounded-full border border-input bg-card px-3 text-xs font-medium hover:bg-muted"
                >
                  {l}
                </button>
              ),
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Things we plug in here</CardTitle>
            <CardDescription>
              The week aggregates from every other module.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-1.5 text-sm sm:grid-cols-2">
              <li>· Content calendar items</li>
              <li>· Email plan</li>
              <li>· SMS plan</li>
              <li>· Ad priorities</li>
              <li>· Organic social priorities</li>
              <li>· Influencer / UGC needs</li>
              <li>· Event pushes</li>
              <li>· Local town content</li>
              <li>· Holiday hooks</li>
              <li>· Weather-based pushes</li>
              <li>· Slow-day promos</li>
              <li>· High-margin item pushes</li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </>
  );
}

function Field({
  label,
  value,
  accent,
  subtle,
}: {
  label: string;
  value: string;
  accent?: boolean;
  subtle?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          "mt-0.5",
          accent && "font-semibold text-accent",
          subtle && "text-xs text-muted-foreground",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function statusTone(s: PlannerStatus): string {
  switch (s) {
    case "idea":
      return "bg-muted text-muted-foreground";
    case "planned":
      return "bg-accent/15 text-accent";
    case "in_progress":
      return "bg-amber-500/15 text-amber-700";
    case "needs_approval":
      return "bg-rose-500/10 text-rose-700";
    case "scheduled":
      return "bg-primary/15 text-primary";
    case "live":
      return "bg-emerald-500/15 text-emerald-700";
    case "complete":
      return "bg-emerald-500/15 text-emerald-700 line-through";
  }
}

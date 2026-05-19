import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  NotebookPen,
  Wrench,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import {
  getDailyOpsSnapshot,
  getTodayChecklistsForLocation,
} from "@/lib/server/daily-ops";
import { CHECKLIST_KIND_LABELS } from "@/lib/constants/daily-ops";

export default async function DailyOpsPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  if (!active) {
    return (
      <>
        <PageHeader
          title="Daily Ops"
          description="Opening, closing, manager logs, handoffs, issues."
        />
        <LocationGate multiLocation={locations.length > 1} />
      </>
    );
  }

  const [snapshot, todayChecklists] = await Promise.all([
    getDailyOpsSnapshot(active.id),
    getTodayChecklistsForLocation(active.id),
  ]);

  const openChecklists = todayChecklists.filter(
    (r) => r.completion?.status !== "completed",
  );

  return (
    <>
      <PageHeader
        title="Daily Ops"
        description={`Today at ${active.name}.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={ClipboardCheck}
          label="Open checklists"
          value={snapshot.openChecklists}
          href="/daily-ops/checklists"
        />
        <StatCard
          icon={Wrench}
          label="Open issues"
          value={snapshot.openIssues}
          href="/daily-ops/issues"
        />
        <StatCard
          icon={Ban}
          label="86'd items"
          value={snapshot.eightySixedActive}
          href="/daily-ops/86d"
        />
        <StatCard
          icon={NotebookPen}
          label="Manager log"
          value={null}
          href="/daily-ops/logs"
          caption={
            snapshot.lastManagerLog
              ? `Last: ${snapshot.lastManagerLog.log_date}`
              : "No entries yet"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Today&apos;s checklists</CardTitle>
              <CardDescription>Run before close.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/daily-ops/checklists">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {openChecklists.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-6 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                All checklists completed for today.
              </div>
            ) : (
              <ul className="space-y-2">
                {openChecklists.slice(0, 6).map((row) => (
                  <li key={row.checklist.id}>
                    <Link
                      href={`/daily-ops/checklists/${row.checklist.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 transition-colors hover:bg-accent/40"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug">
                          {row.checklist.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {CHECKLIST_KIND_LABELS[row.checklist.kind]}
                          {row.completion
                            ? " · in progress"
                            : " · not started"}
                        </p>
                      </div>
                      <ClipboardList className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>What changed at this location.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed locationId={active.id} limit={12} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
  caption,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: number | null;
  href: string;
  caption?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      {value !== null ? (
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">{caption}</p>
      )}
    </Link>
  );
}

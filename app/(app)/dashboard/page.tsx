import Link from "next/link";
import {
  Ban,
  ClipboardCheck,
  NotebookPen,
  Wrench,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { SHIFT_LABELS, managerLogPreview } from "@/lib/constants/daily-ops";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { getMyOpenTasks } from "@/lib/server/queries";
import { getDailyOpsSnapshot } from "@/lib/server/daily-ops";

export default async function DashboardPage() {
  const { profile, locations } = await requireUser();
  const { tasks } = await getMyOpenTasks(profile.id);
  const active = resolveActiveLocation(locations);
  const snapshot = active ? await getDailyOpsSnapshot(active.id) : null;

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name ?? "team"}`}
        description="Your home base. Today's priorities, open issues, and what changed."
        action={<TaskFormDialog />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
            <CardDescription>{ROLE_LABELS[profile.role]}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>
              {locations.length === 0
                ? "No locations assigned yet."
                : locations.map((l) => l.name).join(" · ")}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Tasks</CardTitle>
            <CardDescription>Assigned to you.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums">{tasks.length}</p>
          </CardContent>
        </Card>
      </div>

      {active && snapshot ? (
        <section className="mt-6 space-y-3">
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-semibold tracking-tight">
              Today at {active.name}
            </h2>
            <Link
              href="/daily-ops"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Daily Ops
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <TodayStat
              icon={ClipboardCheck}
              label="Open checklists"
              value={snapshot.openChecklists}
              href="/daily-ops/checklists"
            />
            <TodayStat
              icon={Wrench}
              label="Open issues"
              value={snapshot.openIssues}
              href="/daily-ops/issues"
            />
            <TodayStat
              icon={Ban}
              label="86'd items"
              value={snapshot.eightySixedActive}
              href="/daily-ops/86d"
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <NotebookPen className="h-4 w-4" />
                  Last manager log
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {snapshot.lastManagerLog ? (
                  <Link
                    href="/daily-ops/logs"
                    className="block space-y-1"
                  >
                    <p className="text-xs text-muted-foreground">
                      {snapshot.lastManagerLog.log_date} ·{" "}
                      {SHIFT_LABELS[snapshot.lastManagerLog.shift]} ·{" "}
                      {snapshot.lastManagerLog.author?.full_name ??
                        snapshot.lastManagerLog.author?.email ??
                        "Unknown"}
                    </p>
                    <p className="line-clamp-2 text-sm">
                      {managerLogPreview(snapshot.lastManagerLog)}
                    </p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No log entries yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your Tasks</CardTitle>
            <CardDescription>
              Open work assigned to you, sorted by due date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks}
              emptyTitle="You're clear"
              emptyDescription="Nothing assigned to you right now."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>What changed across SWELL.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed limit={15} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function TodayStat({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: typeof ClipboardCheck;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col rounded-lg border bg-card p-4 transition-colors hover:bg-accent/40"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
    </Link>
  );
}

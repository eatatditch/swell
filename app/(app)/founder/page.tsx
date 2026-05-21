import { Compass } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { PriorityList } from "@/components/founder/priorities/priority-list";
import { PriorityFormDialog } from "@/components/founder/priorities/priority-form-dialog";
import { DecisionLogList } from "@/components/founder/decisions/decision-log-list";
import { DecisionFormDialog } from "@/components/founder/decisions/decision-form-dialog";
import { CashSnapshotEditor } from "@/components/founder/cash/cash-snapshot-editor";
import { CashSnapshotList } from "@/components/founder/cash/cash-snapshot-list";
import { CompanyIssueFeed } from "@/components/founder/issues/company-issue-feed";
import { AccountabilityBoard } from "@/components/founder/accountability/accountability-board";
import { BrandPurposePanel } from "@/components/founder/brand-purpose-panel";
import { requireAdmin } from "@/lib/auth/get-user";
import { getFounderData } from "@/lib/server/founder";
import { formatCents } from "@/lib/constants/daily-ops";
import { isOpenPriority, weekStart } from "@/lib/constants/founder";

export default async function FounderPage() {
  await requireAdmin();
  const data = await getFounderData();

  const openPriorities = data.priorities.filter((p) =>
    isOpenPriority(p.status),
  );
  const openFollowUps = data.decisions.filter(
    (d) => d.follow_up && !d.follow_up_done_at,
  );
  const latestCash = data.cashSnapshots[0] ?? null;
  const overdueCount = data.accountability.reduce(
    (n, row) => n + row.overdueTasks,
    0,
  );

  return (
    <>
      <PageHeader
        title="Founder View"
        description="The weekly review. Priorities, decisions, cash, accountability."
      />

      <section className="mb-8">
        <BrandPurposePanel />
      </section>

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Active priorities"
          value={String(openPriorities.length)}
          hint={`${data.priorities.length - openPriorities.length} closed`}
        />
        <SummaryCard
          label="Open follow-ups"
          value={String(openFollowUps.length)}
          hint={`${data.decisions.length} total decisions`}
        />
        <SummaryCard
          label="Cash on hand"
          value={
            latestCash ? formatCents(latestCash.cash_on_hand_cents) : "—"
          }
          hint={
            latestCash
              ? `as of ${latestCash.snapshot_date}`
              : "no snapshot yet"
          }
        />
        <SummaryCard
          label="Overdue across team"
          value={String(overdueCount)}
          hint={`${data.issues.length} open issues`}
          tone={overdueCount > 0 ? "warn" : "default"}
        />
      </section>

      <Tabs defaultValue="priorities" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="priorities">Priorities</TabsTrigger>
          <TabsTrigger value="decisions">Decisions</TabsTrigger>
          <TabsTrigger value="cash">Cash</TabsTrigger>
          <TabsTrigger value="issues">Issues</TabsTrigger>
          <TabsTrigger value="accountability">Accountability</TabsTrigger>
        </TabsList>

        <TabsContent value="priorities" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Strategic priorities</CardTitle>
                <CardDescription>
                  What we are pushing on. Owner accountable, status visible.
                </CardDescription>
              </div>
              <PriorityFormDialog staff={data.staff} />
            </CardHeader>
            <CardContent>
              {data.staff.length === 0 ? (
                <EmptyState
                  icon={Compass}
                  title="Add team members first"
                  description="Priorities need owners. Invite team in /admin/users."
                />
              ) : (
                <PriorityList
                  priorities={data.priorities}
                  staff={data.staff}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Decision log</CardTitle>
                <CardDescription>
                  What we decided, why, and what happens next.
                </CardDescription>
              </div>
              <DecisionFormDialog staff={data.staff} />
            </CardHeader>
            <CardContent>
              <DecisionLogList decisions={data.decisions} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                This week&apos;s cash snapshot
              </CardTitle>
              <CardDescription>
                Manual entry, Mondays. Cash, A/P, A/R, weekly burn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashSnapshotEditor
                defaultDate={latestCash?.snapshot_date ?? weekStart()}
                defaults={
                  latestCash
                    ? {
                        cashOnHandCents: latestCash.cash_on_hand_cents,
                        payablesCents: latestCash.payables_cents,
                        receivablesCents: latestCash.receivables_cents,
                        weeklyBurnCents: latestCash.weekly_burn_cents,
                        notes: latestCash.notes,
                      }
                    : undefined
                }
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">History</CardTitle>
              <CardDescription>
                Last 26 weeks. Runway = cash ÷ weekly burn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CashSnapshotList snapshots={data.cashSnapshots} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Company-wide open work</CardTitle>
              <CardDescription>
                Tasks, maintenance, and guest incidents still open across
                every location.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CompanyIssueFeed issues={data.issues} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="accountability" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accountability board</CardTitle>
              <CardDescription>
                Who is holding what. Open tasks, overdue, maintenance issues,
                and manager logs in the last 7 days.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AccountabilityBoard rows={data.accountability} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p
          className={
            tone === "warn"
              ? "text-3xl font-semibold tabular-nums text-rose-600"
              : "text-3xl font-semibold tabular-nums"
          }
        >
          {value}
        </p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

import Link from "next/link";
import {
  Bell,
  CalendarCheck,
  DollarSign,
  Inbox,
  Plus,
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
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { getCateringOverview, listLeads } from "@/lib/server/catering";
import {
  formatCents,
  formatEventDate,
} from "@/lib/constants/catering";
import { LeadStatusBadge } from "@/components/catering/status-badges";

export default async function CateringOverviewPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  const [overview, recentLeads] = await Promise.all([
    getCateringOverview({ locationId: active?.id ?? null }),
    listLeads({
      locationId: active?.id ?? null,
      status: "all",
    }).then((rows) => rows.slice(0, 6)),
  ]);

  return (
    <>
      <PageHeader
        title="Catering & Events"
        description={
          active
            ? `Pipeline + events at ${active.name}.`
            : "Pipeline + events across locations."
        }
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/leads/new">
              <Plus className="h-4 w-4" />
              New deal
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Inbox}
          label="Open leads"
          value={overview.openLeads}
          href="/catering/leads"
        />
        <StatCard
          icon={CalendarCheck}
          label="This week"
          value={overview.thisWeekEvents}
          href="/catering/events"
        />
        <StatCard
          icon={DollarSign}
          label="Booked (month)"
          value={null}
          caption={formatCents(overview.monthRevenueCents)}
          href="/catering/events"
        />
        <StatCard
          icon={Bell}
          label="Open follow-ups"
          value={overview.pendingFollowups}
          href="/catering/leads"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-base">Recent leads</CardTitle>
              <CardDescription>Latest pipeline activity.</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/catering/leads">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <p className="rounded-md border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                No leads yet — start with{" "}
                <Link
                  href="/catering/leads/new"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  a new lead
                </Link>
                .
              </p>
            ) : (
              <ul className="space-y-2">
                {recentLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/catering/leads/${lead.id}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {lead.contact.full_name}
                          {lead.contact.company ? (
                            <span className="text-muted-foreground">
                              {" "}
                              · {lead.contact.company}
                            </span>
                          ) : null}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {lead.event_type ?? "—"}
                          {lead.desired_date
                            ? ` · ${formatEventDate(lead.desired_date)}`
                            : ""}
                          {lead.owner?.full_name
                            ? ` · owner: ${lead.owner.full_name}`
                            : ""}
                        </p>
                      </div>
                      <LeadStatusBadge status={lead.status} />
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
            <CardDescription>Latest catering changes.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed
              objectType={undefined}
              locationId={active?.id ?? null}
              limit={12}
            />
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
  icon: typeof CalendarCheck;
  label: string;
  value: number | null;
  href: string;
  caption?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon className="h-4 w-4" />
        {label}
      </div>
      {value !== null ? (
        <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
      ) : (
        <p className="mt-3 text-2xl font-semibold tabular-nums">{caption}</p>
      )}
    </Link>
  );
}

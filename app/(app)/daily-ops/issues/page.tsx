import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { IssueList } from "@/components/daily-ops/issues/issue-list";
import { NewIssueDialog } from "@/components/daily-ops/issues/new-issue-dialog";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/constants/daily-ops";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import type {
  MaintenanceIssue,
  MaintenanceStatus,
  ProfileLite,
} from "@/lib/types/database";

interface PageProps {
  searchParams: { status?: string };
}

export default async function DailyOpsIssuesPage({ searchParams }: PageProps) {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  const statusFilter = parseStatus(searchParams.status);

  if (!active) {
    return (
      <>
        <PageHeader
          title="Maintenance Issues"
          description="Equipment, building, and recurring problems."
        />
        <LocationGate multiLocation={locations.length > 1} />
      </>
    );
  }

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("maintenance_issues")
    .select(
      "*, reporter:profiles!maintenance_issues_reported_by_fkey(id, full_name, email, avatar_url), assignee:profiles!maintenance_issues_assigned_to_fkey(id, full_name, email, avatar_url)",
    )
    .eq("location_id", active.id)
    .order("created_at", { ascending: false });

  if (statusFilter === "open_active") {
    query = query.neq("status", "resolved");
  } else if (statusFilter) {
    query = query.eq("status", statusFilter);
  }

  const { data } = await query;
  const issues = (data ?? []) as (MaintenanceIssue & {
    reporter: ProfileLite | null;
    assignee: ProfileLite | null;
  })[];

  return (
    <>
      <PageHeader
        title="Maintenance Issues"
        description={`Open issues at ${active.name}.`}
        action={<NewIssueDialog locationId={active.id} />}
      />

      <FilterBar current={statusFilter} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filterLabel(statusFilter)}
          </CardTitle>
          <CardDescription>
            {issues.length} {issues.length === 1 ? "issue" : "issues"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <IssueList currentUserId={profile.id} issues={issues} />
        </CardContent>
      </Card>
    </>
  );
}

type Filter = MaintenanceStatus | "open_active" | "all";

function parseStatus(s?: string): Filter {
  if (s === "all") return "all";
  if (s && MAINTENANCE_STATUSES.includes(s as MaintenanceStatus)) {
    return s as MaintenanceStatus;
  }
  return "open_active";
}

function filterLabel(f: Filter): string {
  if (f === "open_active") return "Open + in progress";
  if (f === "all") return "All issues";
  return MAINTENANCE_STATUS_LABELS[f];
}

function FilterBar({ current }: { current: Filter }) {
  const options: { value: Filter; label: string }[] = [
    { value: "open_active", label: "Open" },
    { value: "in_progress", label: "In progress" },
    { value: "resolved", label: "Resolved" },
    { value: "all", label: "All" },
  ];
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Link
          key={o.value}
          href={
            o.value === "open_active"
              ? "/daily-ops/issues"
              : `/daily-ops/issues?status=${o.value}`
          }
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            current === o.value
              ? "border-foreground bg-foreground text-background"
              : "border-input bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

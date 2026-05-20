import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  DecisionLog,
  FounderCashSnapshot,
  FounderPriority,
  GuestIncident,
  Location,
  MaintenanceIssue,
  ProfileLite,
  Task,
} from "@/lib/types/database";

type LocationLite = Pick<Location, "id" | "name">;

export interface CompanyIssue {
  kind: "task" | "maintenance" | "guest_incident";
  id: string;
  title: string;
  detail: string | null;
  created_at: string;
  location: LocationLite | null;
  owner: ProfileLite | null;
  status: string;
  priority: string | null;
  href: string;
}

export interface AccountabilityRow {
  profile: ProfileLite;
  openTasks: number;
  overdueTasks: number;
  openIssues: number;
  managerLogs7d: number;
}

export interface FounderData {
  priorities: (FounderPriority & { owner: ProfileLite | null })[];
  decisions: (DecisionLog & { owner: ProfileLite | null })[];
  cashSnapshots: FounderCashSnapshot[];
  issues: CompanyIssue[];
  accountability: AccountabilityRow[];
  staff: ProfileLite[];
  locations: LocationLite[];
}

/**
 * One pass that fetches everything the founder view needs. Admin-only;
 * RLS already blocks non-admins from these tables.
 */
export async function getFounderData(): Promise<FounderData> {
  const supabase = createSupabaseServerClient();

  const [
    prioritiesRes,
    decisionsRes,
    cashRes,
    locationsRes,
    staffRes,
    tasksRes,
    maintRes,
    incidentsRes,
    logs7dRes,
  ] = await Promise.all([
    supabase
      .from("founder_priorities")
      .select(
        "*, owner:profiles!founder_priorities_owner_id_fkey(id, full_name, email, avatar_url)",
      )
      .order("status", { ascending: true })
      .order("position", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("decision_logs")
      .select(
        "*, owner:profiles!decision_logs_owner_id_fkey(id, full_name, email, avatar_url)",
      )
      .order("decided_on", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("founder_cash_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(26),
    supabase
      .from("locations")
      .select("id, name, slug, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role, is_active")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("tasks")
      .select(
        "*, assignee:profiles!tasks_assigned_to_fkey(id, full_name, email, avatar_url)",
      )
      .not("status", "in", "(done,archived)")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(50),
    supabase
      .from("maintenance_issues")
      .select(
        "*, assignee:profiles!maintenance_issues_assigned_to_fkey(id, full_name, email, avatar_url)",
      )
      .neq("status", "resolved")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("guest_incidents")
      .select("*")
      .eq("status", "open")
      .order("occurred_at", { ascending: false })
      .limit(25),
    supabase
      .from("manager_logs")
      .select("author_id, created_at")
      .gte(
        "created_at",
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      ),
  ]);

  const locations = (locationsRes.data ?? []).map((l) => ({
    id: l.id as string,
    name: l.name as string,
  }));
  const locById = new Map(locations.map((l) => [l.id, l] as const));

  const staff = (staffRes.data ?? []) as (ProfileLite & {
    role: string;
    is_active: boolean;
  })[];
  const staffById = new Map(staff.map((p) => [p.id, p] as const));

  const taskRows = (tasksRes.data ?? []) as (Task & {
    assignee: ProfileLite | null;
  })[];
  const maintRows = (maintRes.data ?? []) as (MaintenanceIssue & {
    assignee: ProfileLite | null;
  })[];
  const incidentRows = (incidentsRes.data ?? []) as GuestIncident[];

  const issues: CompanyIssue[] = [
    ...taskRows.map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      detail: t.due_date ? `Due ${t.due_date.slice(0, 10)}` : null,
      created_at: t.created_at,
      location: t.location_id ? locById.get(t.location_id) ?? null : null,
      owner: t.assignee,
      status: t.status,
      priority: t.priority,
      href: "/dashboard",
    })),
    ...maintRows.map((m) => ({
      kind: "maintenance" as const,
      id: m.id,
      title: m.title,
      detail: m.description ?? null,
      created_at: m.created_at,
      location: locById.get(m.location_id) ?? null,
      owner: m.assignee,
      status: m.status,
      priority: m.priority,
      href: "/daily-ops/issues",
    })),
    ...incidentRows.map((g) => ({
      kind: "guest_incident" as const,
      id: g.id,
      title: g.summary,
      detail: null,
      created_at: g.occurred_at,
      location: locById.get(g.location_id) ?? null,
      owner: null,
      status: g.status,
      priority: g.severity,
      href: "/daily-ops/issues",
    })),
  ].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  // Accountability — only count people who hold something or have logged.
  const counters = new Map<
    string,
    {
      openTasks: number;
      overdueTasks: number;
      openIssues: number;
      managerLogs7d: number;
    }
  >();
  const ensure = (id: string) => {
    let c = counters.get(id);
    if (!c) {
      c = { openTasks: 0, overdueTasks: 0, openIssues: 0, managerLogs7d: 0 };
      counters.set(id, c);
    }
    return c;
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const t of taskRows) {
    if (!t.assigned_to) continue;
    const c = ensure(t.assigned_to);
    c.openTasks += 1;
    if (t.due_date && new Date(t.due_date) < today) c.overdueTasks += 1;
  }
  for (const m of maintRows) {
    if (!m.assigned_to) continue;
    ensure(m.assigned_to).openIssues += 1;
  }
  for (const row of (logs7dRes.data ?? []) as {
    author_id: string | null;
  }[]) {
    if (!row.author_id) continue;
    ensure(row.author_id).managerLogs7d += 1;
  }

  const accountability: AccountabilityRow[] = [...counters.entries()]
    .map(([id, c]) => {
      const profile = staffById.get(id) ?? {
        id,
        full_name: null,
        email: null,
        avatar_url: null,
      };
      return { profile, ...c };
    })
    .sort((a, b) => {
      if (b.overdueTasks !== a.overdueTasks)
        return b.overdueTasks - a.overdueTasks;
      if (b.openTasks !== a.openTasks) return b.openTasks - a.openTasks;
      return (a.profile.full_name ?? a.profile.email ?? "").localeCompare(
        b.profile.full_name ?? b.profile.email ?? "",
      );
    });

  return {
    priorities: (prioritiesRes.data ?? []) as (FounderPriority & {
      owner: ProfileLite | null;
    })[],
    decisions: (decisionsRes.data ?? []) as (DecisionLog & {
      owner: ProfileLite | null;
    })[],
    cashSnapshots: (cashRes.data ?? []) as FounderCashSnapshot[],
    issues,
    accountability,
    staff: staff.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      avatar_url: p.avatar_url,
    })),
    locations,
  };
}

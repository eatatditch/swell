import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/constants/daily-ops";
import type {
  Checklist,
  ChecklistCompletion,
  ChecklistItem,
  ChecklistItemCompletion,
  EightySixedItem,
  ManagerLog,
  MaintenanceIssue,
  ProfileLite,
} from "@/lib/types/database";

export interface DailyOpsSnapshot {
  openIssues: number;
  eightySixedActive: number;
  openChecklists: number;
  lastManagerLog: (ManagerLog & { author: ProfileLite | null }) | null;
}

/** Snapshot of "today" for a single location, used by /daily-ops and /dashboard. */
export async function getDailyOpsSnapshot(
  locationId: string,
): Promise<DailyOpsSnapshot> {
  const supabase = createSupabaseServerClient();
  const today = todayISO();

  const [issues, eightySixed, templates, completions, lastLog] =
    await Promise.all([
      supabase
        .from("maintenance_issues")
        .select("id", { count: "exact", head: true })
        .eq("location_id", locationId)
        .neq("status", "resolved"),
      supabase
        .from("eighty_sixed_items")
        .select("id", { count: "exact", head: true })
        .eq("location_id", locationId)
        .is("resolved_at", null),
      supabase
        .from("checklists")
        .select("id, location_id")
        .eq("is_active", true)
        .or(`location_id.is.null,location_id.eq.${locationId}`),
      supabase
        .from("checklist_completions")
        .select("checklist_id, status")
        .eq("location_id", locationId)
        .eq("run_date", today),
      supabase
        .from("manager_logs")
        .select(
          "*, author:profiles!manager_logs_author_id_fkey(id, full_name, email, avatar_url)",
        )
        .eq("location_id", locationId)
        .order("log_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const completedChecklists = new Set(
    (completions.data ?? [])
      .filter((c) => c.status === "completed")
      .map((c) => c.checklist_id),
  );

  const openChecklists = (templates.data ?? []).filter(
    (t) => !completedChecklists.has(t.id),
  ).length;

  return {
    openIssues: issues.count ?? 0,
    eightySixedActive: eightySixed.count ?? 0,
    openChecklists,
    lastManagerLog: (lastLog.data as DailyOpsSnapshot["lastManagerLog"]) ?? null,
  };
}

export interface TodayChecklistRow {
  checklist: Checklist;
  completion: ChecklistCompletion | null;
}

export async function getTodayChecklistsForLocation(
  locationId: string,
): Promise<TodayChecklistRow[]> {
  const supabase = createSupabaseServerClient();
  const today = todayISO();

  const { data: templates } = await supabase
    .from("checklists")
    .select("*")
    .eq("is_active", true)
    .or(`location_id.is.null,location_id.eq.${locationId}`)
    .order("kind")
    .order("name");

  const { data: completions } = await supabase
    .from("checklist_completions")
    .select("*")
    .eq("location_id", locationId)
    .eq("run_date", today);

  const byChecklist = new Map<string, ChecklistCompletion>();
  for (const c of (completions ?? []) as ChecklistCompletion[]) {
    byChecklist.set(c.checklist_id, c);
  }

  return ((templates ?? []) as Checklist[]).map((t) => ({
    checklist: t,
    completion: byChecklist.get(t.id) ?? null,
  }));
}

export interface ChecklistRunData {
  checklist: Checklist;
  items: ChecklistItem[];
  completion: ChecklistCompletion;
  itemCompletions: ChecklistItemCompletion[];
}

export async function getChecklistRun(
  checklistId: string,
  locationId: string,
  runDate: string,
): Promise<ChecklistRunData | null> {
  const supabase = createSupabaseServerClient();

  const { data: checklist } = await supabase
    .from("checklists")
    .select("*")
    .eq("id", checklistId)
    .maybeSingle();
  if (!checklist) return null;

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", checklistId)
    .order("position");

  const { data: completion } = await supabase
    .from("checklist_completions")
    .select("*")
    .eq("checklist_id", checklistId)
    .eq("location_id", locationId)
    .eq("run_date", runDate)
    .maybeSingle();
  if (!completion) return null;

  const { data: itemCompletions } = await supabase
    .from("checklist_item_completions")
    .select("*")
    .eq("completion_id", completion.id);

  return {
    checklist: checklist as Checklist,
    items: (items ?? []) as ChecklistItem[],
    completion: completion as ChecklistCompletion,
    itemCompletions: (itemCompletions ?? []) as ChecklistItemCompletion[],
  };
}

export async function getActiveEightySixed(
  locationId: string,
): Promise<EightySixedItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("eighty_sixed_items")
    .select("*")
    .eq("location_id", locationId)
    .is("resolved_at", null)
    .order("created_at", { ascending: false });
  return (data ?? []) as EightySixedItem[];
}

export async function getOpenMaintenanceIssues(
  locationId: string,
): Promise<MaintenanceIssue[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("maintenance_issues")
    .select("*")
    .eq("location_id", locationId)
    .neq("status", "resolved")
    .order("created_at", { ascending: false });
  return (data ?? []) as MaintenanceIssue[];
}

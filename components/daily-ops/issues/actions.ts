"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { MAINTENANCE_STATUSES } from "@/lib/constants/daily-ops";
import { PRIORITIES } from "@/lib/constants/tasks";
import type { MaintenanceStatus } from "@/lib/types/database";

const createSchema = z.object({
  locationId: z.string().uuid(),
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(PRIORITIES as [string, ...string[]]).default("normal"),
  assignedTo: z.string().uuid().optional().nullable(),
});

export type CreateIssueInput = z.input<typeof createSchema>;

export async function createMaintenanceIssue(raw: CreateIssueInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: issue, error } = await supabase
    .from("maintenance_issues")
    .insert({
      created_by: user.id,
      location_id: v.locationId,
      title: v.title,
      description: v.description ?? null,
      priority: v.priority,
      status: "open",
      reported_by: user.id,
      assigned_to: v.assignedTo ?? null,
    })
    .select("*")
    .single();

  if (error || !issue) {
    return { error: error?.message ?? "Could not create issue" };
  }

  await logActivity({
    verb: "created",
    objectType: "maintenance_issue",
    objectId: issue.id,
    summary: issue.title,
    locationId: issue.location_id,
  });

  if (issue.assigned_to && issue.assigned_to !== user.id) {
    await notify({
      recipientId: issue.assigned_to,
      kind: "issue_assigned",
      title: "Maintenance issue assigned",
      body: issue.title,
      link: "/daily-ops/issues",
      sourceType: "maintenance_issue",
      sourceId: issue.id,
    });
  }

  revalidatePath("/daily-ops", "layout");
  return { issue };
}

const statusSchema = z.object({
  issueId: z.string().uuid(),
  status: z.enum(MAINTENANCE_STATUSES as [string, ...string[]]),
});

export async function updateIssueStatus(
  issueId: string,
  status: MaintenanceStatus,
) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = statusSchema.safeParse({ issueId, status });
  if (!parsed.success) return { error: "Invalid input" };

  const update: {
    status: MaintenanceStatus;
    resolved_at?: string | null;
  } = { status };
  if (status === "resolved") {
    update.resolved_at = new Date().toISOString();
  } else {
    update.resolved_at = null;
  }

  const { data: issue, error } = await supabase
    .from("maintenance_issues")
    .update(update)
    .eq("id", issueId)
    .select("*")
    .single();
  if (error || !issue) {
    return { error: error?.message ?? "Could not update issue" };
  }

  await logActivity({
    verb: status === "resolved" ? "completed" : "updated",
    objectType: "maintenance_issue",
    objectId: issue.id,
    summary: issue.title,
    locationId: issue.location_id,
    metadata: { status },
  });

  revalidatePath("/daily-ops", "layout");
  return { issue };
}

export async function deleteMaintenanceIssue(issueId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("maintenance_issues")
    .delete()
    .eq("id", issueId);
  if (error) return { error: error.message };
  revalidatePath("/daily-ops", "layout");
  return { ok: true };
}

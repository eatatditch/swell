"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { TASK_STATUSES, PRIORITIES } from "@/lib/constants/tasks";
import type { TaskStatus } from "@/lib/types/database";

const createSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(5000).optional().nullable(),
  priority: z.enum(PRIORITIES as [string, ...string[]]),
  status: z.enum(TASK_STATUSES as [string, ...string[]]).default("open"),
  assignedTo: z.string().uuid().optional().nullable(),
  dueDate: z.string().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  sourceType: z.string().max(64).optional().nullable(),
  sourceId: z.string().uuid().optional().nullable(),
});

export type CreateTaskInput = z.input<typeof createSchema>;

export async function createTask(raw: CreateTaskInput) {
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

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      created_by: user.id,
      title: v.title,
      description: v.description ?? null,
      priority: v.priority,
      status: v.status,
      assigned_to: v.assignedTo ?? null,
      due_date: v.dueDate ?? null,
      location_id: v.locationId ?? null,
      source_type: v.sourceType ?? null,
      source_id: v.sourceId ?? null,
    })
    .select("*")
    .single();

  if (error || !task) {
    return { error: error?.message ?? "Could not create task" };
  }

  await logActivity({
    verb: "created",
    objectType: "task",
    objectId: task.id,
    summary: task.title,
    locationId: task.location_id,
  });

  if (task.assigned_to && task.assigned_to !== user.id) {
    await notify({
      recipientId: task.assigned_to,
      kind: "task_assigned",
      title: "New task assigned to you",
      body: task.title,
      sourceType: "task",
      sourceId: task.id,
    });
  }

  revalidatePath("/", "layout");
  return { task };
}

const updateStatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(TASK_STATUSES as [string, ...string[]]),
});

export async function updateTaskStatus(taskId: string, status: TaskStatus) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = updateStatusSchema.safeParse({ taskId, status });
  if (!parsed.success) return { error: "Invalid input" };

  const { data: task, error } = await supabase
    .from("tasks")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.taskId)
    .select("*")
    .single();

  if (error || !task) {
    return { error: error?.message ?? "Could not update task" };
  }

  await logActivity({
    verb: parsed.data.status === "done" ? "completed" : "updated",
    objectType: "task",
    objectId: task.id,
    summary: task.title,
    locationId: task.location_id,
    metadata: { status: parsed.data.status },
  });

  revalidatePath("/", "layout");
  return { task };
}

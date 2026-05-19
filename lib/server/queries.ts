import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Notification, ProfileLite, Task } from "@/lib/types/database";

export async function getRecentNotifications(
  userId: string,
  limit = 10,
): Promise<{ items: Notification[]; unread: number }> {
  const supabase = createSupabaseServerClient();

  const [items, unread] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("recipient_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", userId)
      .is("read_at", null),
  ]);

  return {
    items: (items.data ?? []) as Notification[],
    unread: unread.count ?? 0,
  };
}

export async function getMyOpenTasks(
  userId: string,
  limit = 5,
): Promise<{ tasks: Task[]; assignees: Record<string, ProfileLite> }> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("tasks")
    .select("*")
    .eq("assigned_to", userId)
    .not("status", "in", "(done,archived)")
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  const tasks = (data ?? []) as Task[];
  return { tasks, assignees: {} };
}

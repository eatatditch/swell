"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canWriteContent } from "@/lib/server/training";
import { logActivity } from "@/lib/server/activity";
import type { Role } from "@/lib/types/database";

async function requireManager() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !canWriteContent(profile.role as Role)) {
    return { supabase, error: "Managers only" as const };
  }
  return { supabase, userId: user.id };
}

const createSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().max(5000).optional().nullable(),
  pinned: z.boolean().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  pathId: z.string().uuid().optional().nullable(),
});

export async function createAnnouncement(raw: z.input<typeof createSchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_announcements")
    .insert({
      created_by: userId,
      title: v.title.trim(),
      body: v.body?.trim() || null,
      pinned: v.pinned,
      expires_at: v.expiresAt ?? null,
      course_id: v.courseId ?? null,
      path_id: v.pathId ?? null,
    })
    .select("*")
    .single();
  if (insertErr || !data) {
    return { error: insertErr?.message ?? "Could not create announcement" };
  }
  await logActivity({
    verb: "created",
    objectType: "training_announcement",
    objectId: data.id,
    summary: data.title,
  });
  revalidatePath("/training", "layout");
  revalidatePath("/dashboard");
  return { announcement: data };
}

export async function deleteAnnouncement(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_announcements")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function togglePinned(id: string, pinned: boolean) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: updateErr } = await supabase
    .from("training_announcements")
    .update({ pinned })
    .eq("id", id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  revalidatePath("/dashboard");
  return { ok: true };
}

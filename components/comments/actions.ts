"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/server/activity";

const schema = z.object({
  parentType: z.string().min(1).max(64),
  parentId: z.string().uuid(),
  body: z.string().min(1, "Comment cannot be empty").max(5000),
  locationId: z.string().uuid().optional().nullable(),
});

export type CreateCommentInput = z.input<typeof schema>;

export async function createComment(raw: CreateCommentInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: comment, error } = await supabase
    .from("comments")
    .insert({
      created_by: user.id,
      parent_type: v.parentType,
      parent_id: v.parentId,
      body: v.body.trim(),
    })
    .select("*")
    .single();

  if (error || !comment) {
    return { error: error?.message ?? "Could not post comment" };
  }

  await logActivity({
    verb: "commented",
    objectType: v.parentType,
    objectId: v.parentId,
    summary: v.body.slice(0, 140),
    locationId: v.locationId ?? null,
  });

  revalidatePath("/", "layout");
  return { comment };
}

export async function deleteComment(commentId: string) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

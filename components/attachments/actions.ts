"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { logActivity } from "@/lib/server/activity";

const recordSchema = z.object({
  parentType: z.string().min(1).max(64),
  parentId: z.string().uuid(),
  bucket: z.string().min(1).max(64),
  path: z.string().min(1).max(512),
  filename: z.string().min(1).max(256),
  mimeType: z.string().max(128).optional().nullable(),
  sizeBytes: z.number().int().nonnegative().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
});

export type RecordAttachmentInput = z.input<typeof recordSchema>;

/**
 * Insert the attachment row after the client has uploaded the file to
 * Supabase Storage. The browser owns the upload (it has the user's JWT);
 * the server owns the audit trail.
 */
export async function recordAttachment(raw: RecordAttachmentInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const parsed = recordSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: row, error } = await supabase
    .from("attachments")
    .insert({
      created_by: user.id,
      parent_type: v.parentType,
      parent_id: v.parentId,
      bucket: v.bucket,
      path: v.path,
      filename: v.filename,
      mime_type: v.mimeType ?? null,
      size_bytes: v.sizeBytes ?? null,
    })
    .select("*")
    .single();

  if (error || !row) {
    return { error: error?.message ?? "Could not save attachment" };
  }

  await logActivity({
    verb: "attached",
    objectType: v.parentType,
    objectId: v.parentId,
    summary: v.filename,
    locationId: v.locationId ?? null,
    metadata: { attachment_id: row.id, bucket: v.bucket, path: v.path },
  });

  revalidatePath("/", "layout");
  return { attachment: row };
}

export async function deleteAttachment(attachmentId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Read row first to know what to delete from storage.
  const { data: row } = await supabase
    .from("attachments")
    .select("*")
    .eq("id", attachmentId)
    .single();
  if (!row) return { error: "Attachment not found" };

  const { error: dbErr } = await supabase
    .from("attachments")
    .delete()
    .eq("id", attachmentId);
  if (dbErr) return { error: dbErr.message };

  // Clean up the underlying object. Use the admin client to avoid storage
  // RLS edge cases on shared buckets.
  try {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(row.bucket).remove([row.path]);
  } catch {
    // The DB record is the source of truth. Orphaned objects are noise,
    // not corruption, and we'd rather not block the user on cleanup.
  }

  revalidatePath("/", "layout");
  return { ok: true };
}

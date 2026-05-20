import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type { UserNotificationPreferences } from "@/lib/types/database";

const DEFAULT_PREFS: Omit<
  UserNotificationPreferences,
  "user_id" | "created_at" | "updated_at"
> = {
  email_on_new_lead: true,
  email_on_quote_paid: true,
  email_on_comment: true,
  email_on_assignment: true,
  digest_daily: false,
};

export async function getMyNotificationPreferences(): Promise<UserNotificationPreferences | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_notification_preferences")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (data) return data as UserNotificationPreferences;

  // First read — seed defaults so subsequent reads return a real row and
  // the form has stable initial values.
  const seed = { user_id: user.id, ...DEFAULT_PREFS };
  const { data: created } = await supabase
    .from("user_notification_preferences")
    .insert(seed)
    .select("*")
    .single();
  return (created ?? null) as UserNotificationPreferences | null;
}

interface UpdateMyProfileArgs {
  fullName: string;
  phone: string | null;
  bio: string | null;
  jobTitle: string | null;
  startDate: string | null;
  avatarUrl: string | null;
}

export async function updateMyProfile(
  args: UpdateMyProfileArgs,
): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: args.fullName,
      phone: args.phone,
      bio: args.bio,
      job_title: args.jobTitle,
      start_date: args.startDate,
      avatar_url: args.avatarUrl,
    })
    .eq("id", user.id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function updateMyNotificationPreferences(args: {
  email_on_new_lead: boolean;
  email_on_quote_paid: boolean;
  email_on_comment: boolean;
  email_on_assignment: boolean;
  digest_daily: boolean;
}): Promise<{ ok: true } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };
  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert({ user_id: user.id, ...args }, { onConflict: "user_id" });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function changeMyPassword(
  newPassword: string,
): Promise<{ ok: true } | { error: string }> {
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };
  return { ok: true };
}

// Avatar upload uses the public 'avatars' bucket. The storage RLS policy
// requires path prefix == auth.uid().
export async function uploadMyAvatar(
  file: File,
): Promise<{ url: string } | { error: string }> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const objectPath = `${user.id}/avatar-${Date.now()}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from("avatars")
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  if (uploadErr) return { error: uploadErr.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(objectPath);
  return { url: data.publicUrl };
}

// Admin variant — lets a founder swap any teammate's avatar from the
// admin edit form. Bypasses RLS via the admin client; path prefix is the
// target user id so the resulting URL stays consistent with self-uploads.
export async function uploadAvatarForUser(
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const objectPath = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("avatars")
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) return { error: error.message };
  const { data } = admin.storage.from("avatars").getPublicUrl(objectPath);
  return { url: data.publicUrl };
}

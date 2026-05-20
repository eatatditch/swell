"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth/get-user";
import {
  changeMyPassword,
  updateMyNotificationPreferences,
  updateMyProfile,
  uploadMyAvatar,
} from "@/lib/server/profile";

const profileSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(64).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  startDate: z.string().trim().max(32).optional().nullable(),
  avatarUrl: z.string().trim().max(2000).optional().nullable(),
});

export type ProfileInput = z.input<typeof profileSchema>;

export async function updateMyProfileAction(
  input: ProfileInput,
): Promise<{ ok: true } | { error: string }> {
  await requireUser();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await updateMyProfile({
    fullName: parsed.data.fullName,
    phone: parsed.data.phone ?? null,
    bio: parsed.data.bio ?? null,
    jobTitle: parsed.data.jobTitle ?? null,
    startDate: parsed.data.startDate || null,
    avatarUrl: parsed.data.avatarUrl ?? null,
  });
  if ("error" in result) return result;
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true };
}

const prefsSchema = z.object({
  email_on_new_lead: z.boolean(),
  email_on_quote_paid: z.boolean(),
  email_on_comment: z.boolean(),
  email_on_assignment: z.boolean(),
  digest_daily: z.boolean(),
});

export type NotificationPrefsInput = z.infer<typeof prefsSchema>;

export async function updateMyNotificationPreferencesAction(
  input: NotificationPrefsInput,
): Promise<{ ok: true } | { error: string }> {
  await requireUser();
  const parsed = prefsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Invalid input" };
  }
  const result = await updateMyNotificationPreferences(parsed.data);
  if ("error" in result) return result;
  revalidatePath("/profile");
  return { ok: true };
}

const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .max(200);

export async function changeMyPasswordAction(
  newPassword: string,
): Promise<{ ok: true } | { error: string }> {
  await requireUser();
  const parsed = passwordSchema.safeParse(newPassword);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid password" };
  }
  return await changeMyPassword(parsed.data);
}

export async function uploadMyAvatarAction(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  const ctx = await requireUser();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Avatar must be under 5 MB" };
  }
  const result = await uploadMyAvatar(file);
  if ("error" in result) return result;
  // Persist the new URL immediately so the avatar sticks even if the
  // user closes the form. Touch only avatar_url — preserve everything
  // else.
  const { createSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = createSupabaseServerClient();
  await supabase
    .from("profiles")
    .update({ avatar_url: result.url })
    .eq("id", ctx.profile.id);
  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return result;
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-user";
import {
  deleteUserCompletely,
  inviteUser,
  resendInvite,
  setUserActive,
  updateUserAsAdmin,
} from "@/lib/server/users";
import { uploadAvatarForUser } from "@/lib/server/profile";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { logActivity } from "@/lib/server/activity";
import type { Role } from "@/lib/types/database";

const ROLE_VALUES = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
  "marketing_manager",
  "catering_manager",
  "team_member",
] as const;

const inviteSchema = z.object({
  email: z.string().email().max(254),
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(ROLE_VALUES),
  phone: z.string().trim().max(64).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  locationIds: z.array(z.string().uuid()).default([]),
});

export type InviteUserInput = z.input<typeof inviteSchema>;

export async function inviteUserAction(
  input: InviteUserInput,
): Promise<{ userId: string } | { error: string }> {
  await requireAdmin();
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await inviteUser({
    email: parsed.data.email,
    fullName: parsed.data.fullName,
    role: parsed.data.role as Role,
    phone: parsed.data.phone ?? null,
    jobTitle: parsed.data.jobTitle ?? null,
    locationIds: parsed.data.locationIds,
  });
  if ("error" in result) return result;
  await logActivity({
    verb: "invited",
    objectType: "profile",
    objectId: result.userId,
    summary: `${parsed.data.fullName} (${parsed.data.email})`,
  });
  revalidatePath("/admin/users");
  return result;
}

const updateSchema = z.object({
  fullName: z.string().trim().min(1).max(200),
  role: z.enum(ROLE_VALUES),
  phone: z.string().trim().max(64).optional().nullable(),
  jobTitle: z.string().trim().max(120).optional().nullable(),
  startDate: z.string().trim().max(32).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable(),
  isActive: z.boolean(),
  locationIds: z.array(z.string().uuid()).default([]),
});

export type UpdateUserInput = z.input<typeof updateSchema>;

export async function updateUserAction(
  userId: string,
  input: UpdateUserInput,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await updateUserAsAdmin(userId, {
    fullName: parsed.data.fullName,
    role: parsed.data.role as Role,
    phone: parsed.data.phone ?? null,
    jobTitle: parsed.data.jobTitle ?? null,
    startDate: parsed.data.startDate ?? null,
    bio: parsed.data.bio ?? null,
    isActive: parsed.data.isActive,
    locationIds: parsed.data.locationIds,
  });
  if ("error" in result) return result;
  await logActivity({
    verb: "updated",
    objectType: "profile",
    objectId: userId,
    summary: parsed.data.fullName,
  });
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function resendInviteAction(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { data: prof } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", userId)
    .maybeSingle();
  if (!prof?.email) return { error: "User has no email on file" };
  const result = await resendInvite(prof.email, prof.full_name);
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return { ok: true };
}

export async function toggleUserActiveAction(
  userId: string,
  isActive: boolean,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const result = await setUserActive(userId, isActive);
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
  return { ok: true };
}

export async function deleteUserAction(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireAdmin();
  if (ctx.profile.id === userId) {
    return { error: "You can't delete your own account" };
  }
  const result = await deleteUserCompletely(userId);
  if ("error" in result) return result;
  revalidatePath("/admin/users");
  return { ok: true };
}

// Avatar upload from the admin edit page. Accepts a FormData payload
// because file inputs don't serialise across server actions cleanly.
export async function uploadUserAvatarAction(
  userId: string,
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Avatar must be under 5 MB" };
  }
  const result = await uploadAvatarForUser(userId, file);
  if ("error" in result) return result;
  const admin = createSupabaseAdminClient();
  await admin
    .from("profiles")
    .update({ avatar_url: result.url })
    .eq("id", userId);
  revalidatePath(`/admin/users/${userId}`);
  return result;
}

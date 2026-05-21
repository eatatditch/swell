"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import {
  updateAssistantKb,
  updateSystemSettings,
  upsertLocationHours,
} from "@/lib/server/settings";

const hexRe = /^#?[0-9a-fA-F]{6}$/;

const settingsSchema = z.object({
  companyName: z.string().trim().max(200).optional().nullable(),
  logoUrl: z.string().trim().max(1000).optional().nullable(),
  primaryColor: z
    .string()
    .trim()
    .max(7)
    .optional()
    .nullable()
    .refine((v) => !v || hexRe.test(v), "Use a 6-digit hex like #F97316"),
  defaultEmailFromName: z.string().trim().max(120).optional().nullable(),
  defaultEmailSignature: z.string().trim().max(2000).optional().nullable(),
  defaultReplyTo: z
    .string()
    .trim()
    .max(254)
    .optional()
    .nullable()
    .refine(
      (v) => !v || /.+@.+\..+/.test(v),
      "Reply-to must be a valid email",
    ),
  defaultDepositDollars: z.number().min(0).max(1_000_000),
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function updateSystemSettingsAction(
  input: SettingsInput,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await updateSystemSettings({
    companyName: parsed.data.companyName ?? null,
    logoUrl: parsed.data.logoUrl ?? null,
    primaryColor: parsed.data.primaryColor
      ? parsed.data.primaryColor.startsWith("#")
        ? parsed.data.primaryColor
        : `#${parsed.data.primaryColor}`
      : null,
    defaultEmailFromName: parsed.data.defaultEmailFromName ?? null,
    defaultEmailSignature: parsed.data.defaultEmailSignature ?? null,
    defaultReplyTo: parsed.data.defaultReplyTo ?? null,
    defaultDepositCents: Math.round(parsed.data.defaultDepositDollars * 100),
  });
  if ("error" in result) return result;
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true };
}

const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

const hoursSchema = z.array(
  z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    openTime: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((v) => !v || timeRe.test(v), "Use HH:MM"),
    closeTime: z
      .string()
      .trim()
      .optional()
      .nullable()
      .refine((v) => !v || timeRe.test(v), "Use HH:MM"),
    isClosed: z.boolean(),
  }),
);

export type HoursInput = z.infer<typeof hoursSchema>;

export async function updateLocationHoursAction(
  locationId: string,
  days: HoursInput,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = hoursSchema.safeParse(days);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const result = await upsertLocationHours(
    locationId,
    parsed.data.map((d) => ({
      dayOfWeek: d.dayOfWeek,
      openTime: d.openTime ?? null,
      closeTime: d.closeTime ?? null,
      isClosed: d.isClosed,
    })),
  );
  if ("error" in result) return result;
  revalidatePath("/admin/settings");
  return { ok: true };
}

const assistantKbSchema = z.object({
  assistantKb: z.string().max(50_000).optional().nullable(),
});

export async function updateAssistantKbAction(
  input: z.input<typeof assistantKbSchema>,
): Promise<{ ok: true } | { error: string }> {
  await requireAdmin();
  const parsed = assistantKbSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const value = parsed.data.assistantKb?.trim() || null;
  const result = await updateAssistantKb(value);
  if ("error" in result) return result;
  revalidatePath("/admin/settings");
  return { ok: true };
}

// Logo upload — uses the avatars bucket under a logos/ prefix. Admin
// client bypasses RLS so any admin can manage.
export async function uploadLogoAction(
  formData: FormData,
): Promise<{ url: string } | { error: string }> {
  await requireAdmin();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Pick a file" };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { error: "Logo must be under 5 MB" };
  }
  const admin = createSupabaseAdminClient();
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const objectPath = `logos/logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("avatars")
    .upload(objectPath, file, {
      upsert: false,
      contentType: file.type || undefined,
    });
  if (error) return { error: error.message };
  const { data } = admin.storage.from("avatars").getPublicUrl(objectPath);
  await admin
    .from("system_settings")
    .update({ logo_url: data.publicUrl })
    .eq("id", 1);
  revalidatePath("/admin/settings");
  return { url: data.publicUrl };
}

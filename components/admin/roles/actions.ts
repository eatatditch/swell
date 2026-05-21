"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/get-user";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { isCodeDefault } from "@/lib/server/role-access";
import { MODULES } from "@/lib/constants/modules";

const ROLE_VALUES = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
  "marketing_manager",
  "catering_manager",
  "team_member",
] as const;

const schema = z.object({
  role: z.enum(ROLE_VALUES),
  moduleSlug: z.string().min(1).max(64),
  isVisible: z.boolean(),
});

export type ToggleAccessInput = z.input<typeof schema>;

export async function toggleRoleAccessAction(
  input: ToggleAccessInput,
): Promise<{ ok: true } | { error: string }> {
  const ctx = await requireAdmin();
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  if (!MODULES.some((m) => m.slug === parsed.data.moduleSlug)) {
    return { error: "Unknown module" };
  }
  // Floor: founder_admin keeps Admin + Dashboard, no matter what.
  if (
    parsed.data.role === "founder_admin" &&
    (parsed.data.moduleSlug === "admin" ||
      parsed.data.moduleSlug === "dashboard") &&
    !parsed.data.isVisible
  ) {
    return {
      error: "Founder / Admin can't lose access to Admin or Dashboard",
    };
  }

  const admin = createSupabaseAdminClient();

  // If the override matches the code default, just delete the row so the
  // matrix stays "default" rather than "explicit override == default".
  // Keeps the storage clean and lets us show a "modified" indicator that
  // actually means something.
  if (
    isCodeDefault(parsed.data.role, parsed.data.moduleSlug) ===
    parsed.data.isVisible
  ) {
    const { error } = await admin
      .from("role_module_access")
      .delete()
      .eq("role", parsed.data.role)
      .eq("module_slug", parsed.data.moduleSlug);
    if (error) return { error: error.message };
  } else {
    const { error } = await admin.from("role_module_access").upsert(
      {
        role: parsed.data.role,
        module_slug: parsed.data.moduleSlug,
        is_visible: parsed.data.isVisible,
        updated_by: ctx.profile.id,
      },
      { onConflict: "role,module_slug" },
    );
    if (error) return { error: error.message };
  }

  revalidatePath("/admin/roles");
  // The sidebar uses the matrix too — bust the cached layout for everyone.
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetRoleAccessAction(): Promise<
  { ok: true } | { error: string }
> {
  await requireAdmin();
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("role_module_access")
    .delete()
    .neq("role", "__never__");
  if (error) return { error: error.message };
  revalidatePath("/admin/roles");
  revalidatePath("/", "layout");
  return { ok: true };
}

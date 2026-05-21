import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MODULES, type ModuleDef } from "@/lib/constants/modules";
import { ROLES } from "@/lib/constants/roles";
import type { Role } from "@/lib/types/database";

export interface RoleModuleOverride {
  role: Role;
  module_slug: string;
  is_visible: boolean;
}

export interface ResolvedAccess {
  /** Effective is_visible by role × module_slug. */
  matrix: Record<Role, Record<string, boolean>>;
  /** The raw overrides as stored, for the admin UI to show "modified" hints. */
  overrides: RoleModuleOverride[];
}

// Founder-admin can always see Admin. This is a hard floor — even if the
// matrix tries to revoke it, the UI ignores the override. Stops admins
// from locking themselves out.
const FLOOR: Partial<Record<Role, string[]>> = {
  founder_admin: ["admin", "dashboard"],
};

function codeDefault(role: Role, slug: string): boolean {
  const mod = MODULES.find((m) => m.slug === slug);
  if (!mod) return false;
  return mod.visibleTo.includes(role);
}

export async function loadAccessOverrides(): Promise<RoleModuleOverride[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("role_module_access")
    .select("role, module_slug, is_visible");
  return (data ?? []) as RoleModuleOverride[];
}

export async function resolveAccess(): Promise<ResolvedAccess> {
  const overrides = await loadAccessOverrides();
  const overrideMap = new Map<string, boolean>();
  for (const o of overrides) {
    overrideMap.set(`${o.role}::${o.module_slug}`, o.is_visible);
  }

  const matrix = {} as Record<Role, Record<string, boolean>>;
  for (const role of ROLES) {
    matrix[role] = {};
    for (const m of MODULES) {
      const key = `${role}::${m.slug}`;
      const fromOverride = overrideMap.has(key)
        ? Boolean(overrideMap.get(key))
        : codeDefault(role, m.slug);
      const floored = (FLOOR[role] ?? []).includes(m.slug) ? true : fromOverride;
      matrix[role][m.slug] = floored;
    }
  }
  return { matrix, overrides };
}

// Resolve the module list for a single role — used by the layout to
// build the sidebar.
export async function getModulesForRole(role: Role): Promise<ModuleDef[]> {
  const { matrix } = await resolveAccess();
  return MODULES.filter((m) => matrix[role]?.[m.slug] ?? false);
}

export function isCodeDefault(role: Role, slug: string): boolean {
  return codeDefault(role, slug);
}

import "server-only";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Location, Profile } from "@/lib/types/database";

export interface AuthContext {
  userId: string;
  profile: Profile;
  locations: Location[];
}

/**
 * Loads the current user's profile and accessible locations.
 * Redirects to /login if there is no session.
 *
 * For admins (founder_admin) or users assigned to `company_wide`,
 * `locations` contains every active location.
 */
export async function requireUser(): Promise<AuthContext> {
  const supabase = createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    // Profile row missing — sign out and bounce. The signup trigger should
    // have created it, so this is a real error worth surfacing.
    await supabase.auth.signOut();
    redirect("/login?error=missing_profile");
  }

  const locations = await loadAccessibleLocations(supabase, profile as Profile);

  return {
    userId: user.id,
    profile: profile as Profile,
    locations,
  };
}

async function loadAccessibleLocations(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  profile: Profile,
): Promise<Location[]> {
  // Admin sees every active location.
  if (profile.role === "founder_admin") {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as Location[];
  }

  const { data: assignments } = await supabase
    .from("user_location_assignments")
    .select("location_id, locations(*)")
    .eq("user_id", profile.id);

  if (!assignments) return [];

  const hasCompanyWide = assignments.some(
    (a) =>
      // joined row may be an object or array depending on FK introspection
      (Array.isArray(a.locations) ? a.locations[0] : a.locations)?.slug ===
      "company_wide",
  );

  if (hasCompanyWide) {
    const { data } = await supabase
      .from("locations")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []) as Location[];
  }

  return assignments
    .map((a) => (Array.isArray(a.locations) ? a.locations[0] : a.locations))
    .filter((l): l is Location => !!l && l.is_active)
    .sort((a, b) => a.sort_order - b.sort_order);
}

export async function requireAdmin(): Promise<AuthContext> {
  const ctx = await requireUser();
  if (ctx.profile.role !== "founder_admin") {
    redirect("/dashboard");
  }
  return ctx;
}

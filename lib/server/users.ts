import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type { Location, Profile, Role } from "@/lib/types/database";

export interface AdminUserLocation {
  id: string;
  slug: string;
  name: string;
}

export interface AdminUserRow extends Profile {
  locations: AdminUserLocation[];
  has_logged_in: boolean;
  last_sign_in_at: string | null;
  invited_at: string | null;
}

// List every profile for the admin users page. Joined to location
// assignments so the row can show which locations the user touches.
// Auth lookup runs against auth.users via the admin client so we can
// surface invite + last sign-in state.
export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const supabase = createSupabaseServerClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*, user_location_assignments(location:locations(id, slug, name))")
    .order("created_at", { ascending: false });

  if (!profiles) return [];

  const admin = createSupabaseAdminClient();
  // listUsers is paginated; 1000 per page is the supabase max. For now
  // the team is small so a single page covers it.
  const { data: authList } = await admin.auth.admin.listUsers({
    perPage: 1000,
  });
  const authById = new Map(authList?.users.map((u) => [u.id, u]) ?? []);

  return profiles.map((p) => {
    const auth = authById.get(p.id);
    const assignments = (p.user_location_assignments ?? []) as Array<{
      location: { id: string; slug: string; name: string } | null;
    }>;
    return {
      ...(p as Profile),
      locations: assignments
        .map((a) => a.location)
        .filter((l): l is AdminUserLocation => !!l),
      has_logged_in: Boolean(auth?.last_sign_in_at),
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      invited_at: auth?.invited_at ?? null,
    } satisfies AdminUserRow;
  });
}

export interface AdminUserDetail extends AdminUserRow {
  email_confirmed_at: string | null;
}

export async function getAdminUser(id: string): Promise<AdminUserDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, user_location_assignments(location:locations(id, slug, name))")
    .eq("id", id)
    .maybeSingle();
  if (!profile) return null;

  const admin = createSupabaseAdminClient();
  const { data: auth } = await admin.auth.admin.getUserById(id);

  const assignments = (profile.user_location_assignments ?? []) as Array<{
    location: { id: string; slug: string; name: string } | null;
  }>;
  return {
    ...(profile as Profile),
    locations: assignments
      .map((a) => a.location)
      .filter((l): l is { id: string; slug: string; name: string } => !!l),
    has_logged_in: Boolean(auth?.user?.last_sign_in_at),
    last_sign_in_at: auth?.user?.last_sign_in_at ?? null,
    invited_at: auth?.user?.invited_at ?? null,
    email_confirmed_at: auth?.user?.email_confirmed_at ?? null,
  };
}

interface InviteUserArgs {
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  jobTitle?: string | null;
  locationIds: string[];
  redirectTo?: string;
}

// Sends a Supabase invite email. The handle_new_user trigger creates the
// profile row from the auth insert; we then upsert the rest (role, phone,
// title) and write the location assignments.
export async function inviteUser(
  args: InviteUserArgs,
): Promise<{ userId: string } | { error: string }> {
  const admin = createSupabaseAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(args.email, {
    data: { full_name: args.fullName },
    redirectTo: args.redirectTo,
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Could not send invite" };
  }
  const userId = data.user.id;

  // Trigger created an initial row. Update with the rest of the fields.
  const { error: updateErr } = await admin
    .from("profiles")
    .update({
      full_name: args.fullName,
      role: args.role,
      phone: args.phone ?? null,
      job_title: args.jobTitle ?? null,
      is_active: true,
    })
    .eq("id", userId);
  if (updateErr) {
    return { error: `Invite sent, but profile update failed: ${updateErr.message}` };
  }

  if (args.locationIds.length > 0) {
    const rows = args.locationIds.map((lid) => ({
      user_id: userId,
      location_id: lid,
    }));
    const { error: assignErr } = await admin
      .from("user_location_assignments")
      .insert(rows);
    if (assignErr) {
      return {
        error: `Invite sent, but location assignment failed: ${assignErr.message}`,
      };
    }
  }

  return { userId };
}

interface UpdateUserArgs {
  fullName: string;
  role: Role;
  phone: string | null;
  jobTitle: string | null;
  startDate: string | null;
  bio: string | null;
  isActive: boolean;
  locationIds: string[];
}

export async function updateUserAsAdmin(
  userId: string,
  args: UpdateUserArgs,
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();

  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      full_name: args.fullName,
      role: args.role,
      phone: args.phone,
      job_title: args.jobTitle,
      start_date: args.startDate,
      bio: args.bio,
      is_active: args.isActive,
    })
    .eq("id", userId);
  if (profileErr) {
    return { error: profileErr.message };
  }

  // Replace location assignments. Cheap because the table is small.
  await admin.from("user_location_assignments").delete().eq("user_id", userId);
  if (args.locationIds.length > 0) {
    const rows = args.locationIds.map((lid) => ({
      user_id: userId,
      location_id: lid,
    }));
    const { error } = await admin
      .from("user_location_assignments")
      .insert(rows);
    if (error) {
      return { error: error.message };
    }
  }

  return { ok: true };
}

export async function resendInvite(
  email: string,
  fullName: string | null,
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: fullName ? { full_name: fullName } : undefined,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function setUserActive(
  userId: string,
  isActive: boolean,
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);
  if (error) return { error: error.message };
  // Banning the auth.user actually blocks them from signing in; we just
  // flip the profile flag. The middleware / requireUser path can choose to
  // enforce this. Keeping it soft so admins can flip without breaking the
  // session of the user currently signed in.
  return { ok: true };
}

export async function deleteUserCompletely(
  userId: string,
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function listAllLocationsForAssignment(): Promise<Location[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as Location[];
}

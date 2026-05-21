import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type {
  CateringSettings,
  Location,
  LocationHours,
  SystemSettings,
} from "@/lib/types/database";

export async function getSystemSettings(): Promise<SystemSettings | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("system_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  return (data as SystemSettings | null) ?? null;
}

export async function getLocationsWithHours(): Promise<
  Array<Location & { hours: LocationHours[] }>
> {
  const supabase = createSupabaseServerClient();
  const { data: locations } = await supabase
    .from("locations")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  const { data: hours } = await supabase
    .from("location_hours")
    .select("*");

  const byLocation = new Map<string, LocationHours[]>();
  for (const h of (hours ?? []) as LocationHours[]) {
    const arr = byLocation.get(h.location_id) ?? [];
    arr.push(h);
    byLocation.set(h.location_id, arr);
  }

  return ((locations ?? []) as Location[]).map((l) => ({
    ...l,
    hours: (byLocation.get(l.id) ?? []).sort(
      (a, b) => a.day_of_week - b.day_of_week,
    ),
  }));
}

export async function getStripeConnectionsByLocation(): Promise<CateringSettings[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_settings")
    .select("*")
    .order("location_id");
  return (data ?? []) as CateringSettings[];
}

interface UpdateSystemSettingsArgs {
  companyName: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  defaultEmailFromName: string | null;
  defaultEmailSignature: string | null;
  defaultReplyTo: string | null;
  defaultDepositCents: number;
}

export async function updateSystemSettings(
  args: UpdateSystemSettingsArgs,
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("system_settings")
    .update({
      company_name: args.companyName,
      logo_url: args.logoUrl,
      primary_color: args.primaryColor,
      default_email_from_name: args.defaultEmailFromName,
      default_email_signature: args.defaultEmailSignature,
      default_reply_to: args.defaultReplyTo,
      default_deposit_cents: args.defaultDepositCents,
    })
    .eq("id", 1);
  if (error) return { error: error.message };
  return { ok: true };
}

interface DayHoursInput {
  dayOfWeek: number;
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
}

export async function upsertLocationHours(
  locationId: string,
  days: DayHoursInput[],
): Promise<{ ok: true } | { error: string }> {
  const admin = createSupabaseAdminClient();
  const rows = days.map((d) => ({
    location_id: locationId,
    day_of_week: d.dayOfWeek,
    open_time: d.isClosed ? null : d.openTime,
    close_time: d.isClosed ? null : d.closeTime,
    is_closed: d.isClosed,
  }));
  const { error } = await admin
    .from("location_hours")
    .upsert(rows, { onConflict: "location_id,day_of_week" });
  if (error) return { error: error.message };
  return { ok: true };
}

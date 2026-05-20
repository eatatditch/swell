import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  CateringPaymentLink,
  CateringSettings,
  Location,
} from "@/lib/types/database";

export type SettingsWithLocation = CateringSettings & {
  location: Pick<Location, "id" | "name" | "slug"> | null;
};

export async function listSettings(): Promise<SettingsWithLocation[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_settings")
    .select("*, location:locations(id, name, slug)")
    .order("created_at", { ascending: true });
  return (data ?? []) as SettingsWithLocation[];
}

export async function getSettingsForLocation(
  locationId: string | null,
): Promise<CateringSettings | null> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("catering_settings").select("*").limit(1);
  if (locationId) query = query.eq("location_id", locationId);
  else query = query.is("location_id", null);
  const { data } = await query.maybeSingle();
  return (data as CateringSettings | null) ?? null;
}

export async function getSettingsByStripeAccount(
  stripeAccountId: string,
): Promise<CateringSettings | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_settings")
    .select("*")
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();
  return (data as CateringSettings | null) ?? null;
}

export async function listPaymentLinks(
  invoiceId: string,
): Promise<CateringPaymentLink[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("catering_payment_links")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("created_at", { ascending: false });
  return (data ?? []) as CateringPaymentLink[];
}

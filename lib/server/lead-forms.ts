import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  LeadForm,
  LeadFormSubmission,
  Location,
} from "@/lib/types/database";

export interface LeadFormWithLocation extends LeadForm {
  location: Pick<Location, "id" | "name" | "slug"> | null;
}

export async function listLeadForms(opts: {
  locationId?: string | null;
}): Promise<LeadFormWithLocation[]> {
  const supabase = createSupabaseServerClient();
  let q = supabase
    .from("lead_forms")
    .select(
      "*, location:locations!lead_forms_location_id_fkey(id, name, slug)",
    )
    .order("created_at", { ascending: false });
  if (opts.locationId) q = q.eq("location_id", opts.locationId);
  const { data } = await q;
  return (data ?? []) as unknown as LeadFormWithLocation[];
}

export async function getLeadFormById(
  id: string,
): Promise<LeadFormWithLocation | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("lead_forms")
    .select(
      "*, location:locations!lead_forms_location_id_fkey(id, name, slug)",
    )
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as LeadFormWithLocation) ?? null;
}

export async function listFormSubmissions(opts: {
  formId: string;
  limit?: number;
}): Promise<LeadFormSubmission[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("lead_form_submissions")
    .select("*")
    .eq("form_id", opts.formId)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);
  return (data ?? []) as LeadFormSubmission[];
}

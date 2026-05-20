import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailMessage, GmailAccount } from "@/lib/types/database";

export async function listGmailAccountsForUser(
  userId: string,
): Promise<GmailAccount[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  return (data ?? []) as GmailAccount[];
}

export async function getCurrentUserGmailAccount(): Promise<GmailAccount | null> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("gmail_accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return (data as GmailAccount) ?? null;
}

export async function listEmailsForLead(
  leadId: string,
  limit = 50,
): Promise<EmailMessage[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .eq("lead_id", leadId)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as EmailMessage[];
}

export async function listEmailsForContact(
  contactId: string,
  limit = 50,
): Promise<EmailMessage[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .eq("contact_id", contactId)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as EmailMessage[];
}

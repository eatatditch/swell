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

// Emails relevant to a quote: anything tied to the quote's lead OR contact
// (covers conversations that started before the quote was drafted).
export async function listEmailsForQuote(
  quoteId: string,
  limit = 50,
): Promise<EmailMessage[]> {
  const supabase = createSupabaseServerClient();
  const { data: quote } = await supabase
    .from("catering_quotes")
    .select("contact_id, lead_id")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return [];
  const filters: string[] = [];
  if (quote.contact_id) filters.push(`contact_id.eq.${quote.contact_id}`);
  if (quote.lead_id) filters.push(`lead_id.eq.${quote.lead_id}`);
  if (filters.length === 0) return [];
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .or(filters.join(","))
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  return (data ?? []) as EmailMessage[];
}

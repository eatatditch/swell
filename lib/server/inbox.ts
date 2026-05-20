import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EmailMessage } from "@/lib/types/database";

export interface InboxThread {
  thread_id: string;
  contact_id: string | null;
  contact_name: string | null;
  lead_id: string | null;
  last_subject: string | null;
  last_snippet: string | null;
  last_at: string;
  unread_count: number;
  total: number;
  last_direction: "inbound" | "outbound";
}

export async function listInboxThreads(opts: {
  unreadOnly?: boolean;
  limit?: number;
} = {}): Promise<InboxThread[]> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Pull recent messages for this user's gmail accounts. Group on the client
  // side — Postgres GROUP BY with the JSON join is awkward through PostgREST.
  const { data: accountIds } = await supabase
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id);
  if (!accountIds || accountIds.length === 0) return [];
  const ids = accountIds.map((a) => a.id);

  let query = supabase
    .from("email_messages")
    .select(
      "*, contact:catering_contacts!email_messages_contact_id_fkey(id, full_name)",
    )
    .in("account_id", ids)
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (opts.unreadOnly) {
    query = query.is("read_at", null).eq("direction", "inbound");
  }
  const { data } = await query;

  const rows = (data ?? []) as Array<
    EmailMessage & {
      contact: { id: string; full_name: string } | null;
    }
  >;

  const byThread = new Map<string, InboxThread>();
  for (const m of rows) {
    const existing = byThread.get(m.thread_id);
    if (existing) {
      existing.total += 1;
      if (m.direction === "inbound" && !m.read_at) existing.unread_count += 1;
      continue;
    }
    byThread.set(m.thread_id, {
      thread_id: m.thread_id,
      contact_id: m.contact_id,
      contact_name: m.contact?.full_name ?? null,
      lead_id: m.lead_id,
      last_subject: m.subject,
      last_snippet: m.snippet,
      last_at: m.sent_at ?? m.created_at,
      unread_count: m.direction === "inbound" && !m.read_at ? 1 : 0,
      total: 1,
      last_direction: m.direction,
    });
  }

  return Array.from(byThread.values())
    .sort((a, b) => (a.last_at > b.last_at ? -1 : 1))
    .slice(0, opts.limit ?? 100);
}

export async function listMessagesInThread(
  threadId: string,
): Promise<EmailMessage[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("email_messages")
    .select("*")
    .eq("thread_id", threadId)
    .order("sent_at", { ascending: true, nullsFirst: true });
  return (data ?? []) as EmailMessage[];
}

// Auto-mark inbound emails read when the user is actively viewing them on
// a lead / contact / quote page. Without this, the badge stays stuck at
// "1 unread" because /catering/mail/[threadId] is the only path that
// flips read_at, and most operators read their mail from the lead page
// directly. Cheap — partial index makes the update sub-millisecond when
// there's nothing to mark.
export async function markEmailsReadInScope(scope: {
  leadId?: string | null;
  contactId?: string | null;
}): Promise<void> {
  if (!scope.leadId && !scope.contactId) return;
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: accounts } = await supabase
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id);
  if (!accounts || accounts.length === 0) return;
  const ids = accounts.map((a) => a.id);

  let q = supabase
    .from("email_messages")
    .update({ read_at: new Date().toISOString() })
    .in("account_id", ids)
    .eq("direction", "inbound")
    .is("read_at", null);
  if (scope.leadId && scope.contactId) {
    q = q.or(`lead_id.eq.${scope.leadId},contact_id.eq.${scope.contactId}`);
  } else if (scope.leadId) {
    q = q.eq("lead_id", scope.leadId);
  } else if (scope.contactId) {
    q = q.eq("contact_id", scope.contactId);
  }
  await q;
}

export async function countUnreadForCurrentUser(): Promise<number> {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data: accounts } = await supabase
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id);
  if (!accounts || accounts.length === 0) return 0;
  const ids = accounts.map((a) => a.id);
  const { count } = await supabase
    .from("email_messages")
    .select("id", { count: "exact", head: true })
    .in("account_id", ids)
    .is("read_at", null)
    .eq("direction", "inbound");
  return count ?? 0;
}

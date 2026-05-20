"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// Mark every inbound message in a thread as read for the current user's
// gmail accounts. Outbound messages already have read_at set.
export async function markThreadRead(threadId: string) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: accounts } = await supabase
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id);
  if (!accounts || accounts.length === 0) return { ok: true };
  const ids = accounts.map((a) => a.id);

  await supabase
    .from("email_messages")
    .update({ read_at: new Date().toISOString() })
    .in("account_id", ids)
    .eq("thread_id", threadId)
    .eq("direction", "inbound")
    .is("read_at", null);

  revalidatePath("/catering/mail");
  revalidatePath("/catering", "layout");
  return { ok: true };
}

export async function markAllRead() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const { data: accounts } = await supabase
    .from("gmail_accounts")
    .select("id")
    .eq("user_id", user.id);
  if (!accounts || accounts.length === 0) return { ok: true };
  const ids = accounts.map((a) => a.id);

  await supabase
    .from("email_messages")
    .update({ read_at: new Date().toISOString() })
    .in("account_id", ids)
    .eq("direction", "inbound")
    .is("read_at", null);

  revalidatePath("/catering/mail");
  revalidatePath("/catering", "layout");
  return { ok: true };
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { decryptToken } from "@/lib/google/crypto";
import { revokeToken } from "@/lib/google/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Disconnects the current user's Gmail. Revokes the refresh token at Google
// (so the grant is gone on their side too) and deletes the row; the cascade
// drops email_messages tied to that account.
export async function GET(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const admin = createSupabaseAdminClient();
  const { data: account } = await admin
    .from("gmail_accounts")
    .select("id, refresh_token_enc")
    .eq("user_id", user.id)
    .maybeSingle();

  if (account) {
    try {
      const refresh = decryptToken(account.refresh_token_enc);
      await revokeToken(refresh);
    } catch {
      // Revocation failures are non-fatal — still drop our row.
    }
    await admin.from("gmail_accounts").delete().eq("id", account.id);
  }

  // Match the callback route — wipe the catering subtree cache so the
  // /catering/leads/[id] pages immediately reflect the disconnected state.
  revalidatePath("/catering", "layout");

  const url = new URL("/catering/integrations", request.url);
  url.searchParams.set("disconnected", "1");
  return NextResponse.redirect(url);
}

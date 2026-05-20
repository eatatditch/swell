import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Public endpoint: customer hits "Request changes" with a reason. We mark
// the quote declined; the operator sees the reason on the quote detail page.
export async function POST(
  request: Request,
  { params }: { params: { token: string } },
) {
  const token = params.token;
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  let body: { reason?: string } = {};
  try {
    body = (await request.json()) as { reason?: string };
  } catch {
    /* empty body is fine */
  }

  const reason = (body.reason ?? "").trim().slice(0, 2000);

  const admin = createSupabaseAdminClient();
  const { data: quote } = await admin
    .from("catering_quotes")
    .select("id, deposit_paid_at, declined_at")
    .eq("accept_token", token)
    .maybeSingle();
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }
  if (quote.deposit_paid_at) {
    return NextResponse.json(
      { error: "Deposit already paid — can't decline" },
      { status: 409 },
    );
  }

  await admin
    .from("catering_quotes")
    .update({
      status: "declined",
      declined_at: new Date().toISOString(),
      decline_reason: reason || null,
    })
    .eq("id", quote.id);

  return NextResponse.json({ ok: true });
}

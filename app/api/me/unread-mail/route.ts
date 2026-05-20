import { NextResponse } from "next/server";

import { countUnreadForCurrentUser } from "@/lib/server/inbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Tiny JSON endpoint polled by the sidebar to keep the unread badge live.
// Cheap — just COUNT(*) against an indexed partial index.
export async function GET() {
  const count = await countUnreadForCurrentUser();
  return NextResponse.json({ count });
}

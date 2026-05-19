import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";

interface NotifyInput {
  recipientId: string;
  kind: string;
  title: string;
  body?: string;
  link?: string;
  sourceType?: string;
  sourceId?: string;
}

/**
 * Insert a notification on behalf of another user. RLS reserves direct
 * inserts to admins, so this uses the service-role client. It is safe
 * because it lives in a `server-only` module.
 */
export async function notify(input: NotifyInput) {
  const admin = createSupabaseAdminClient();
  await admin.from("notifications").insert({
    recipient_id: input.recipientId,
    kind: input.kind,
    title: input.title,
    body: input.body ?? null,
    link: input.link ?? null,
    source_type: input.sourceType ?? null,
    source_id: input.sourceId ?? null,
  });
}

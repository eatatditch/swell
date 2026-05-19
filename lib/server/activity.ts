import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

interface LogActivityInput {
  verb: string;
  objectType: string;
  objectId: string;
  summary?: string;
  locationId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Append a row to activity_log on behalf of the current user. RLS enforces
 * that actor_id = auth.uid(), so this can only ever stamp the caller as
 * actor — exactly what we want.
 */
export async function logActivity(input: LogActivityInput) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("activity_log").insert({
    actor_id: user.id,
    location_id: input.locationId ?? null,
    verb: input.verb,
    object_type: input.objectType,
    object_id: input.objectId,
    summary: input.summary ?? null,
    metadata: input.metadata ?? {},
  });
}

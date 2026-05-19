import "server-only";

import { Activity } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/data/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry, ProfileLite } from "@/lib/types/database";

interface ActivityFeedProps {
  /** Scope to one object (e.g. a single task). */
  objectType?: string;
  objectId?: string;
  /** Scope to a location (e.g. recent activity at a venue). */
  locationId?: string | null;
  limit?: number;
  className?: string;
}

const VERB_LABELS: Record<string, string> = {
  created: "created",
  updated: "updated",
  completed: "completed",
  commented: "commented on",
  attached: "attached a file to",
  signed_off: "signed off on",
  archived: "archived",
};

function relative(iso: string, now: Date) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(new Date(iso).getFullYear() !== now.getFullYear() && {
      year: "numeric",
    }),
  });
}

function initials(p: ProfileLite | null | undefined) {
  const s = p?.full_name?.trim() || p?.email || "·";
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export async function ActivityFeed({
  objectType,
  objectId,
  locationId,
  limit = 20,
  className,
}: ActivityFeedProps) {
  const supabase = createSupabaseServerClient();

  let query = supabase
    .from("activity_log")
    .select(
      "*, actor:profiles!activity_log_actor_id_fkey(id, full_name, email, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (objectType) query = query.eq("object_type", objectType);
  if (objectId) query = query.eq("object_id", objectId);
  if (locationId !== undefined && locationId !== null) {
    query = query.eq("location_id", locationId);
  }

  const { data } = await query;
  const rows = (data ?? []) as (ActivityLogEntry & {
    actor: ProfileLite | null;
  })[];

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No activity yet"
        description="Activity appears here as people make changes."
        className={className}
      />
    );
  }

  const now = new Date();

  return (
    <ol className={cn("space-y-3", className)}>
      {rows.map((row) => (
        <li key={row.id} className="flex gap-3">
          <Avatar className="h-7 w-7 mt-0.5">
            {row.actor?.avatar_url ? (
              <AvatarImage src={row.actor.avatar_url} alt="" />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {initials(row.actor)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 text-sm">
            <p className="leading-snug">
              <span className="font-medium">
                {row.actor?.full_name ?? row.actor?.email ?? "Someone"}
              </span>{" "}
              <span className="text-muted-foreground">
                {VERB_LABELS[row.verb] ?? row.verb}
              </span>{" "}
              <span className="font-medium">{row.object_type}</span>
              {row.summary ? (
                <span className="text-muted-foreground"> — {row.summary}</span>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              {relative(row.created_at, now)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

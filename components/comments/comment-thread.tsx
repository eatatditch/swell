import "server-only";

import { MessageSquare } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { CommentComposer } from "@/components/comments/comment-composer";
import { EmptyState } from "@/components/data/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Comment, ProfileLite } from "@/lib/types/database";

interface CommentThreadProps {
  parentType: string;
  parentId: string;
  locationId?: string | null;
  composer?: boolean;
}

function initials(profile: ProfileLite | null | undefined) {
  const source = profile?.full_name?.trim() || profile?.email || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function CommentThread({
  parentType,
  parentId,
  locationId,
  composer = true,
}: CommentThreadProps) {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_created_by_fkey(id, full_name, email, avatar_url)")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: true });

  const rows = (data ?? []) as (Comment & { author: ProfileLite | null })[];

  return (
    <div className="space-y-4">
      {rows.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No comments yet"
          description={composer ? "Start the thread." : undefined}
        />
      ) : (
        <ul className="space-y-4">
          {rows.map((c) => (
            <li key={c.id} className="flex gap-3">
              <Avatar className="h-8 w-8">
                {c.author?.avatar_url ? (
                  <AvatarImage src={c.author.avatar_url} alt="" />
                ) : null}
                <AvatarFallback className="text-xs">
                  {initials(c.author)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">
                    {c.author?.full_name ?? c.author?.email ?? "Unknown"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(c.created_at)}
                    {c.edited_at ? " · edited" : null}
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {c.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {composer ? (
        <>
          <Separator />
          <CommentComposer
            parentType={parentType}
            parentId={parentId}
            locationId={locationId ?? null}
          />
        </>
      ) : null}
    </div>
  );
}

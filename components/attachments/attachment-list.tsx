import "server-only";

import { Paperclip } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { AttachmentUploader } from "@/components/attachments/attachment-uploader";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Attachment } from "@/lib/types/database";

interface AttachmentListProps {
  parentType: string;
  parentId: string;
  bucket?: string;
  locationId?: string | null;
  uploader?: boolean;
}

function formatSize(bytes: number | null) {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function AttachmentList({
  parentType,
  parentId,
  bucket = "attachments",
  locationId,
  uploader = true,
}: AttachmentListProps) {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("attachments")
    .select("*")
    .eq("parent_type", parentType)
    .eq("parent_id", parentId)
    .order("created_at", { ascending: false });

  const rows = (data ?? []) as Attachment[];

  // Best-effort URL resolution: signed URLs for private buckets, public
  // URLs for public ones. We do this server-side so the file list renders
  // ready to click.
  const items = await Promise.all(
    rows.map(async (a) => {
      const isPublic = a.bucket === "avatars";
      if (isPublic) {
        const { data: pub } = supabase.storage.from(a.bucket).getPublicUrl(a.path);
        return { row: a, url: pub.publicUrl };
      }
      const { data: signed } = await supabase.storage
        .from(a.bucket)
        .createSignedUrl(a.path, 60 * 60);
      return { row: a, url: signed?.signedUrl ?? null };
    }),
  );

  return (
    <div className="space-y-3">
      {items.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No attachments"
          description={uploader ? "Upload a file to get started." : undefined}
        />
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map(({ row, url }) => (
            <li
              key={row.id}
              className="flex items-center gap-3 px-3 py-2 text-sm"
            >
              <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate font-medium hover:underline"
                  >
                    {row.filename}
                  </a>
                ) : (
                  <span className="truncate">{row.filename}</span>
                )}
                <p className="text-xs text-muted-foreground">
                  {formatSize(row.size_bytes)}
                  {row.mime_type ? ` · ${row.mime_type}` : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {uploader ? (
        <AttachmentUploader
          parentType={parentType}
          parentId={parentId}
          bucket={bucket}
          locationId={locationId ?? null}
        />
      ) : null}
    </div>
  );
}

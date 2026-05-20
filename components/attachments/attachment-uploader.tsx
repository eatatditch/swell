"use client";

import { useRef, useState, useTransition } from "react";
import { Paperclip, UploadCloud } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { recordAttachment } from "@/components/attachments/actions";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

interface AttachmentUploaderProps {
  parentType: string;
  parentId: string;
  /** Storage bucket. Defaults to the generic `attachments` bucket. */
  bucket?: string;
  /** Optional location id to log on activity. */
  locationId?: string | null;
  /** Accept attribute forwarded to the file input. */
  accept?: string;
  className?: string;
}

function safePath(parentType: string, parentId: string, file: File) {
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  const ext = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : "";
  return `${parentType}/${parentId}/${stamp}-${rand}${ext}`;
}

export function AttachmentUploader({
  parentType,
  parentId,
  bucket = "attachments",
  locationId,
  accept,
  className,
}: AttachmentUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const file = files[0];
    if (file.size > MAX_BYTES) {
      setError("File is larger than 25 MB.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    const path = safePath(parentType, parentId, file);

    const { error: uploadErr } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });

    if (uploadErr) {
      setError(uploadErr.message);
      return;
    }

    startTransition(async () => {
      const result = await recordAttachment({
        parentType,
        parentId,
        bucket,
        path,
        filename: file.name,
        mimeType: file.type || null,
        sizeBytes: file.size,
        locationId: locationId ?? null,
      });
      if (result.error) setError(result.error);
    });

    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-2", className)}>
      <label
        className={cn(
          "flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card px-4 py-6 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
          pending && "pointer-events-none opacity-60",
        )}
      >
        <UploadCloud className="h-5 w-5" />
        <span>
          {pending ? "Uploading…" : "Click to upload"}
          <span className="ml-1 text-xs">(max 25 MB)</span>
        </span>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Paperclip className="h-3 w-3" />
        Files are scoped to this item and visible to anyone who can see it.
      </p>

      {/* Reserved for future drag-handle button */}
      <Button type="button" className="sr-only" tabIndex={-1}>
        upload
      </Button>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createComment } from "@/components/comments/actions";

interface CommentComposerProps {
  parentType: string;
  parentId: string;
  locationId?: string | null;
  placeholder?: string;
}

export function CommentComposer({
  parentType,
  parentId,
  locationId,
  placeholder = "Add a comment…",
}: CommentComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!body.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await createComment({
        parentType,
        parentId,
        body: body.trim(),
        locationId: locationId ?? null,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setBody("");
    });
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        disabled={pending}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to post</p>
        <Button
          type="button"
          size="sm"
          onClick={submit}
          disabled={pending || !body.trim()}
        >
          {pending ? "Posting…" : "Post comment"}
        </Button>
      </div>
    </div>
  );
}

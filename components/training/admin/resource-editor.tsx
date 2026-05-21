"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  addLessonResource,
  deleteLessonResource,
} from "@/components/training/content-actions";
import {
  TRAINING_RESOURCE_KIND_LABELS,
  TRAINING_RESOURCE_KINDS,
} from "@/lib/constants/training";
import type {
  TrainingLessonResource,
  TrainingResourceKind,
} from "@/lib/types/database";

interface ResourceEditorProps {
  lessonId: string;
  resources: TrainingLessonResource[];
}

export function ResourceEditor({ lessonId, resources }: ResourceEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteLessonResource(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {resources.length} resource{resources.length === 1 ? "" : "s"}
        </p>
        <NewResourceDialog
          lessonId={lessonId}
          nextPosition={
            (resources[resources.length - 1]?.position ?? 0) + 10
          }
        />
      </div>
      {resources.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add videos, PDFs, or links to back up the lesson.
        </p>
      ) : (
        <ul className="space-y-2">
          {resources.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 text-sm"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted text-accent"
                aria-label="Open"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{r.label || r.url}</p>
                <p className="text-xs text-muted-foreground">
                  {TRAINING_RESOURCE_KIND_LABELS[r.kind]}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(r.id)}
                disabled={pending}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                aria-label="Remove resource"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NewResourceDialog({
  lessonId,
  nextPosition,
}: {
  lessonId: string;
  nextPosition: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<TrainingResourceKind>("link");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!url.trim()) {
      setError("URL is required");
      return;
    }
    startTransition(async () => {
      const res = await addLessonResource({
        lessonId,
        kind,
        url,
        label: label || null,
        position: nextPosition,
        isPrintable: false,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setUrl("");
      setLabel("");
      setKind("link");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Resource
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add resource</DialogTitle>
          <DialogDescription>
            Paste a URL. We embed YouTube/Vimeo on the lesson page; everything
            else opens in a new tab.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="nr-kind">Type</Label>
            <select
              id="nr-kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as TrainingResourceKind)}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            >
              {TRAINING_RESOURCE_KINDS.map((k) => (
                <option key={k} value={k}>
                  {TRAINING_RESOURCE_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-url">URL</Label>
            <Input
              id="nr-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nr-label">Label</Label>
            <Input
              id="nr-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Optional — shown instead of the URL"
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Add resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

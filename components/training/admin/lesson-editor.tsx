"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createLesson } from "@/components/training/content-actions";

export function LessonEditor({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await createLesson({
        courseId,
        title,
        content: content || null,
        videoUrl: videoUrl || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
        position: position ? Number(position) : 10,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setTitle("");
      setContent("");
      setVideoUrl("");
      setEstimatedMinutes("");
      setPosition("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>New lesson</DialogTitle>
          <DialogDescription>
            Body supports Markdown-ish: ## H2, ### H3, - bullets, 1. numbered,
            **bold**, *italic*.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="lesson-title">Title</Label>
            <Input
              id="lesson-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="lesson-pos">Position</Label>
              <Input
                id="lesson-pos"
                type="number"
                min="0"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                placeholder="10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-mins">Est. minutes</Label>
              <Input
                id="lesson-mins"
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-video">Video URL</Label>
              <Input
                id="lesson-video"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtu.be/..."
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="lesson-content">Content</Label>
            <Textarea
              id="lesson-content"
              rows={10}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="## Heading\n\nWhat the lesson covers."
              className="font-mono text-xs"
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
            {pending ? "Saving…" : "Create lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

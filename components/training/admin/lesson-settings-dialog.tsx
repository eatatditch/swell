"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Settings2 } from "lucide-react";

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
import { Textarea } from "@/components/ui/textarea";
import { updateLesson } from "@/components/training/content-actions";
import type { TrainingLesson } from "@/lib/types/database";

export function LessonSettingsDialog({ lesson }: { lesson: TrainingLesson }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [content, setContent] = useState(lesson.content ?? "");
  const [videoUrl, setVideoUrl] = useState(lesson.video_url ?? "");
  const [estimatedMinutes, setEstimatedMinutes] = useState(
    lesson.estimated_minutes != null ? String(lesson.estimated_minutes) : "",
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    startTransition(async () => {
      const res = await updateLesson({
        id: lesson.id,
        courseId: lesson.course_id,
        title,
        content: content || null,
        videoUrl: videoUrl || null,
        estimatedMinutes: estimatedMinutes ? Number(estimatedMinutes) : null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Settings2 className="h-4 w-4" /> Edit lesson
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit lesson</DialogTitle>
          <DialogDescription>
            Markdown + content blocks (`:::callout`, `:::steps`,
            `:::checklist`, `:::takeaway`, `:::compare`).
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="el-title">Title</Label>
            <Input
              id="el-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="el-mins">Est. minutes</Label>
              <Input
                id="el-mins"
                type="number"
                min="1"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="el-video">Video URL</Label>
              <Input
                id="el-video"
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="el-content">Content</Label>
            <Textarea
              id="el-content"
              rows={14}
              value={content}
              onChange={(e) => setContent(e.target.value)}
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
            {pending ? "Saving…" : "Save lesson"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

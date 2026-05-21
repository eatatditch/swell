"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  deleteLesson,
  reorderLessons,
} from "@/components/training/content-actions";

interface LessonRowControlsProps {
  courseId: string;
  lessonIds: string[];
  index: number;
}

export function LessonRowControls({
  courseId,
  lessonIds,
  index,
}: LessonRowControlsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const id = lessonIds[index];

  function move(direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= lessonIds.length) return;
    const next = [...lessonIds];
    [next[index], next[target]] = [next[target], next[index]];
    startTransition(async () => {
      await reorderLessons({ courseId, ids: next });
      router.refresh();
    });
  }

  function remove() {
    if (!confirm("Delete this lesson and any quiz attached to it?")) return;
    startTransition(async () => {
      await deleteLesson(id);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          move(-1);
        }}
        disabled={pending || index === 0}
        className="h-7 w-7"
        aria-label="Move lesson up"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          move(1);
        }}
        disabled={pending || index === lessonIds.length - 1}
        className="h-7 w-7"
        aria-label="Move lesson down"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          remove();
        }}
        disabled={pending}
        className="h-7 w-7 text-muted-foreground hover:text-destructive"
        aria-label="Delete lesson"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

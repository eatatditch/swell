"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { completeLesson } from "@/components/training/actions";

interface MarkCompleteButtonProps {
  lessonId: string;
  alreadyCompleted: boolean;
  nextHref?: string | null;
}

export function MarkCompleteButton({
  lessonId,
  alreadyCompleted,
  nextHref,
}: MarkCompleteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function mark() {
    startTransition(async () => {
      const res = await completeLesson({ lessonId });
      if ("error" in res && res.error) return;
      if (nextHref) {
        router.push(nextHref);
      } else {
        router.refresh();
      }
    });
  }

  if (alreadyCompleted) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <CheckCircle2 className="h-4 w-4" /> Completed
      </Button>
    );
  }

  return (
    <Button onClick={mark} disabled={pending} className="gap-2">
      <CheckCircle2 className="h-4 w-4" />
      {pending ? "Saving…" : nextHref ? "Mark complete & next" : "Mark complete"}
    </Button>
  );
}

"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { StatusBadge } from "@/components/badges/status-badge";
import { DueDateBadge } from "@/components/badges/due-date-badge";
import { updateTaskStatus } from "@/components/tasks/actions";
import { isOpenStatus } from "@/lib/constants/tasks";
import { cn } from "@/lib/utils";
import type { ProfileLite, Task } from "@/lib/types/database";

interface TaskCardProps {
  task: Task;
  assignee?: ProfileLite | null;
  className?: string;
}

export function TaskCard({ task, assignee, className }: TaskCardProps) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "done";

  function toggleDone() {
    startTransition(async () => {
      await updateTaskStatus(task.id, done ? "open" : "done");
    });
  }

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-card p-3 transition-opacity",
        done && "opacity-60",
        className,
      )}
    >
      <Button
        type="button"
        size="icon"
        variant="outline"
        className={cn(
          "h-7 w-7 shrink-0 rounded-full",
          done && "border-primary bg-primary text-primary-foreground hover:bg-primary-deep",
        )}
        onClick={toggleDone}
        disabled={pending}
        aria-label={done ? "Mark as open" : "Mark as done"}
      >
        {done ? <RotateCcw className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      </Button>

      <div className="min-w-0 flex-1">
        <p className={cn("text-sm font-medium leading-snug", done && "line-through")}>
          {task.title}
        </p>
        {task.description ? (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
            {task.description}
          </p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={task.status} />
          <PriorityBadge priority={task.priority} />
          <DueDateBadge dueDate={task.due_date} done={done} />
          {assignee ? (
            <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {assignee.full_name ?? assignee.email ?? "Assigned"}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function TaskCardSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-3 rounded-lg border bg-card p-3">
      <div className="h-7 w-7 shrink-0 rounded-full bg-muted" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-muted" />
        <div className="h-3 w-1/2 rounded bg-muted" />
      </div>
    </div>
  );
}

// helper to keep call sites short when no toggle is wanted (overview lists)
export function ReadonlyTaskCard({
  task,
  assignee,
  className,
}: TaskCardProps) {
  const done = task.status === "done";
  return (
    <div className={cn("rounded-lg border bg-card p-3", className)}>
      <p className={cn("text-sm font-medium", done && "line-through opacity-70")}>
        {task.title}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge status={task.status} />
        <PriorityBadge priority={task.priority} />
        <DueDateBadge dueDate={task.due_date} done={done} />
        {assignee ? (
          <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {assignee.full_name ?? assignee.email}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export { isOpenStatus };

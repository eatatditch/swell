import { cn } from "@/lib/utils";
import { TASK_STATUS_LABELS } from "@/lib/constants/tasks";
import type { TaskStatus } from "@/lib/types/database";

const STATUS_STYLES: Record<TaskStatus, string> = {
  open: "bg-muted text-foreground",
  in_progress: "bg-accent/15 text-accent",
  blocked: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  done: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

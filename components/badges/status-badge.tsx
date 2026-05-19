import { cn } from "@/lib/utils";
import { TASK_STATUS_LABELS } from "@/lib/constants/tasks";
import type { TaskStatus } from "@/lib/types/database";

const STATUS_STYLES: Record<TaskStatus, string> = {
  open: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100",
  in_progress:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  blocked: "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100",
  done: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
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
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status],
        className,
      )}
    >
      {TASK_STATUS_LABELS[status]}
    </span>
  );
}

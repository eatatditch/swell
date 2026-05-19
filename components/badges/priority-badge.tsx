import { cn } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/lib/constants/tasks";
import type { Priority } from "@/lib/types/database";

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "border-muted-foreground/30 text-muted-foreground",
  normal: "border-sky-300 text-sky-800 dark:text-sky-200",
  high: "border-amber-400 text-amber-800 dark:text-amber-200",
  urgent: "border-rose-500 text-rose-800 dark:text-rose-200",
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: Priority;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

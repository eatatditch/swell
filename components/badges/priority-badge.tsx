import { cn } from "@/lib/utils";
import { PRIORITY_LABELS } from "@/lib/constants/tasks";
import type { Priority } from "@/lib/types/database";

const PRIORITY_STYLES: Record<Priority, string> = {
  low: "border-border text-muted-foreground",
  normal: "border-primary/40 text-primary",
  high: "border-accent/60 text-accent",
  urgent: "border-rose-500 text-rose-700 dark:text-rose-300",
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
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        PRIORITY_STYLES[priority],
        className,
      )}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

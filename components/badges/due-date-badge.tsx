import { CalendarClock } from "lucide-react";

import { cn } from "@/lib/utils";

function formatDue(due: Date, now: Date) {
  const sameDay =
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate();
  if (sameDay) return "Today";

  const diffMs = due.getTime() - now.getTime();
  const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (days === -1) return "Yesterday";
  if (days === 1) return "Tomorrow";
  if (days > 1 && days < 7) return `In ${days}d`;
  if (days < -1 && days > -7) return `${Math.abs(days)}d ago`;

  return due.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(due.getFullYear() !== now.getFullYear() && { year: "numeric" }),
  });
}

export function DueDateBadge({
  dueDate,
  done = false,
  className,
}: {
  dueDate: string | null;
  done?: boolean;
  className?: string;
}) {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const overdue = !done && due.getTime() < now.setHours(0, 0, 0, 0);
  const dueToday =
    !done &&
    due.toDateString() === new Date().toDateString();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        overdue
          ? "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100"
          : dueToday
            ? "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100"
            : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <CalendarClock className="h-3 w-3" />
      {formatDue(due, new Date())}
    </span>
  );
}

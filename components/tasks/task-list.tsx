import { CheckCircle2 } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { TaskCard } from "@/components/tasks/task-card";
import type { ProfileLite, Task } from "@/lib/types/database";

interface TaskListProps {
  tasks: Task[];
  assigneesById?: Record<string, ProfileLite>;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function TaskList({
  tasks,
  assigneesById,
  emptyTitle = "No tasks",
  emptyDescription = "Nothing assigned right now.",
}: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id}>
          <TaskCard
            task={t}
            assignee={
              t.assigned_to ? assigneesById?.[t.assigned_to] ?? null : null
            }
          />
        </li>
      ))}
    </ul>
  );
}

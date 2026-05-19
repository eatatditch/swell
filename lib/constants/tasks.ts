import type { Priority, TaskStatus } from "@/lib/types/database";

export const TASK_STATUSES: TaskStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "archived",
];

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

export const PRIORITIES: Priority[] = ["low", "normal", "high", "urgent"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent",
};

export function isOpenStatus(status: TaskStatus): boolean {
  return status !== "done" && status !== "archived";
}

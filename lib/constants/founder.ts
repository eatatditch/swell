import type { FounderPriorityStatus } from "@/lib/types/database";

export const FOUNDER_PRIORITY_STATUSES: FounderPriorityStatus[] = [
  "open",
  "in_progress",
  "blocked",
  "done",
  "archived",
];

export const FOUNDER_PRIORITY_STATUS_LABELS: Record<
  FounderPriorityStatus,
  string
> = {
  open: "Open",
  in_progress: "In progress",
  blocked: "Blocked",
  done: "Done",
  archived: "Archived",
};

export function isOpenPriority(status: FounderPriorityStatus): boolean {
  return status !== "done" && status !== "archived";
}

/** Monday-anchored ISO date for the week containing the given date. */
export function weekStart(d: Date = new Date()): string {
  const copy = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dow = copy.getUTCDay(); // 0=Sun..6=Sat
  const offset = (dow + 6) % 7; // days since Monday
  copy.setUTCDate(copy.getUTCDate() - offset);
  return copy.toISOString().slice(0, 10);
}

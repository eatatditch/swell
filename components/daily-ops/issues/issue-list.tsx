"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { EmptyState } from "@/components/data/empty-state";
import {
  deleteMaintenanceIssue,
  updateIssueStatus,
} from "@/components/daily-ops/issues/actions";
import {
  MAINTENANCE_STATUSES,
  MAINTENANCE_STATUS_LABELS,
} from "@/lib/constants/daily-ops";
import { cn } from "@/lib/utils";
import type {
  MaintenanceIssue,
  MaintenanceStatus,
  ProfileLite,
} from "@/lib/types/database";

interface IssueListProps {
  currentUserId: string;
  issues: (MaintenanceIssue & {
    reporter: ProfileLite | null;
    assignee: ProfileLite | null;
  })[];
}

const STATUS_PILL: Record<MaintenanceStatus, string> = {
  open: "bg-sky-100 text-sky-900 dark:bg-sky-900/30 dark:text-sky-100",
  in_progress:
    "bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100",
  resolved:
    "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100",
};

export function IssueList({ currentUserId, issues }: IssueListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setStatus(id: string, status: MaintenanceStatus) {
    startTransition(async () => {
      await updateIssueStatus(id, status);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteMaintenanceIssue(id);
      router.refresh();
    });
  }

  if (issues.length === 0) {
    return (
      <EmptyState
        icon={Wrench}
        title="No issues match"
        description="Adjust the filter or open a new issue when something breaks."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {issues.map((iss) => (
        <li
          key={iss.id}
          className={cn(
            "rounded-lg border bg-card p-3 transition-opacity",
            iss.status === "resolved" && "opacity-70",
          )}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    STATUS_PILL[iss.status],
                  )}
                >
                  {MAINTENANCE_STATUS_LABELS[iss.status]}
                </span>
                <PriorityBadge priority={iss.priority} />
              </div>
              <p className="mt-1 text-sm font-medium leading-snug">
                {iss.title}
              </p>
              {iss.description ? (
                <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                  {iss.description}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                Reported by{" "}
                {iss.reporter?.full_name ?? iss.reporter?.email ?? "someone"} ·{" "}
                {formatRelative(iss.created_at)}
                {iss.assignee
                  ? ` · assigned to ${iss.assignee.full_name ?? iss.assignee.email}`
                  : null}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-1">
              <select
                value={iss.status}
                onChange={(e) =>
                  setStatus(iss.id, e.target.value as MaintenanceStatus)
                }
                disabled={pending}
                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
              >
                {MAINTENANCE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {MAINTENANCE_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
              {iss.created_by === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(iss.id)}
                  disabled={pending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function formatRelative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Target, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PriorityBadge } from "@/components/badges/priority-badge";
import { EmptyState } from "@/components/data/empty-state";
import {
  deletePriority,
  setPriorityStatus,
  updatePriority,
} from "@/components/founder/priorities/actions";
import {
  FOUNDER_PRIORITY_STATUSES,
  FOUNDER_PRIORITY_STATUS_LABELS,
  isOpenPriority,
} from "@/lib/constants/founder";
import { cn } from "@/lib/utils";
import type {
  FounderPriority,
  FounderPriorityStatus,
  ProfileLite,
} from "@/lib/types/database";

interface PriorityListProps {
  priorities: (FounderPriority & { owner: ProfileLite | null })[];
  staff: ProfileLite[];
}

const STATUS_PILL: Record<FounderPriorityStatus, string> = {
  open: "bg-muted text-foreground",
  in_progress: "bg-accent/15 text-accent",
  blocked: "bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100",
  done: "bg-primary/15 text-primary",
  archived: "bg-muted text-muted-foreground",
};

export function PriorityList({ priorities, staff }: PriorityListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function changeStatus(id: string, status: FounderPriorityStatus) {
    startTransition(async () => {
      await setPriorityStatus(id, status);
      router.refresh();
    });
  }

  function changeOwner(id: string, ownerId: string) {
    startTransition(async () => {
      await updatePriority({ id, ownerId: ownerId || null });
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deletePriority(id);
      router.refresh();
    });
  }

  if (priorities.length === 0) {
    return (
      <EmptyState
        icon={Target}
        title="No priorities yet"
        description="Add the strategic priorities you want the team focused on."
      />
    );
  }

  const open = priorities.filter((p) => isOpenPriority(p.status));
  const closed = priorities.filter((p) => !isOpenPriority(p.status));

  return (
    <div className="space-y-6">
      <Group
        label={`Active · ${open.length}`}
        items={open}
        staff={staff}
        pending={pending}
        onStatusChange={changeStatus}
        onOwnerChange={changeOwner}
        onDelete={remove}
      />
      {closed.length > 0 ? (
        <Group
          label={`Closed · ${closed.length}`}
          items={closed}
          staff={staff}
          pending={pending}
          onStatusChange={changeStatus}
          onOwnerChange={changeOwner}
          onDelete={remove}
          muted
        />
      ) : null}
    </div>
  );
}

interface GroupProps {
  label: string;
  items: (FounderPriority & { owner: ProfileLite | null })[];
  staff: ProfileLite[];
  pending: boolean;
  onStatusChange: (id: string, status: FounderPriorityStatus) => void;
  onOwnerChange: (id: string, ownerId: string) => void;
  onDelete: (id: string) => void;
  muted?: boolean;
}

function Group({
  label,
  items,
  staff,
  pending,
  onStatusChange,
  onOwnerChange,
  onDelete,
  muted,
}: GroupProps) {
  if (items.length === 0) return null;
  return (
    <section>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="space-y-2">
        {items.map((p) => (
          <li
            key={p.id}
            className={cn(
              "rounded-lg border bg-card p-4 transition-opacity",
              muted && "opacity-70",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_PILL[p.status],
                    )}
                  >
                    {FOUNDER_PRIORITY_STATUS_LABELS[p.status]}
                  </span>
                  <PriorityBadge priority={p.priority} />
                  {p.target_date ? (
                    <span className="text-xs text-muted-foreground">
                      Target {p.target_date}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium leading-snug">
                  {p.title}
                </p>
                {p.description ? (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                    {p.description}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  Owner:{" "}
                  {p.owner?.full_name ?? p.owner?.email ?? "Unassigned"}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                <select
                  value={p.status}
                  onChange={(e) =>
                    onStatusChange(p.id, e.target.value as FounderPriorityStatus)
                  }
                  disabled={pending}
                  aria-label="Status"
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  {FOUNDER_PRIORITY_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {FOUNDER_PRIORITY_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <select
                  value={p.owner_id ?? ""}
                  onChange={(e) => onOwnerChange(p.id, e.target.value)}
                  disabled={pending}
                  aria-label="Owner"
                  className="h-8 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  <option value="">— Unassigned —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name ?? s.email ?? "(no name)"}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(p.id)}
                  disabled={pending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

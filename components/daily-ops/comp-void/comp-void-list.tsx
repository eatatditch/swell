"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Receipt, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { deleteCompVoidNote } from "@/components/daily-ops/comp-void/actions";
import {
  COMP_VOID_KIND_LABELS,
  formatCents,
} from "@/lib/constants/daily-ops";
import { cn } from "@/lib/utils";
import type { CompVoidNote, ProfileLite } from "@/lib/types/database";

interface CompVoidListProps {
  notes: (CompVoidNote & { manager: ProfileLite | null })[];
  canDelete: boolean;
}

export function CompVoidList({ notes, canDelete }: CompVoidListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteCompVoidNote(id);
      router.refresh();
    });
  }

  if (notes.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No comps or voids logged"
        description="Comp and void entries from managers appear here."
      />
    );
  }

  const totals = notes.reduce(
    (acc, n) => {
      acc[n.kind] += n.amount_cents;
      return acc;
    },
    { comp: 0, void: 0 } as Record<"comp" | "void", number>,
  );

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Comps</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatCents(totals.comp)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <p className="text-xs text-muted-foreground">Voids</p>
          <p className="text-xl font-semibold tabular-nums">
            {formatCents(totals.void)}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {notes.map((n) => (
          <li
            key={n.id}
            className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-start sm:gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide",
                    n.kind === "comp"
                      ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100"
                      : "bg-rose-100 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100",
                  )}
                >
                  {COMP_VOID_KIND_LABELS[n.kind]}
                </span>
                <span className="text-base font-semibold tabular-nums">
                  {formatCents(n.amount_cents)}
                </span>
                {n.ticket_ref ? (
                  <span className="text-xs text-muted-foreground">
                    Ticket #{n.ticket_ref}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm">{n.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {n.manager?.full_name ?? n.manager?.email ?? "Unknown"} ·{" "}
                {formatDateTime(n.occurred_at)}
              </p>
            </div>
            {canDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(n.id)}
                disabled={pending}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

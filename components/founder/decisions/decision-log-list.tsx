"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, GitCommit, RotateCcw, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import {
  deleteDecision,
  markFollowUpDone,
} from "@/components/founder/decisions/actions";
import { cn } from "@/lib/utils";
import type { DecisionLog, ProfileLite } from "@/lib/types/database";

interface DecisionLogListProps {
  decisions: (DecisionLog & { owner: ProfileLite | null })[];
}

export function DecisionLogList({ decisions }: DecisionLogListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggleDone(id: string, done: boolean) {
    startTransition(async () => {
      await markFollowUpDone(id, done);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteDecision(id);
      router.refresh();
    });
  }

  if (decisions.length === 0) {
    return (
      <EmptyState
        icon={GitCommit}
        title="No decisions logged"
        description="Log decisions as you make them so the team can read the why later."
      />
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <ol className="space-y-3">
      {decisions.map((d) => {
        const hasFollowUp = !!d.follow_up;
        const followUpDone = !!d.follow_up_done_at;
        const followUpDue =
          d.follow_up_due ? new Date(d.follow_up_due) : null;
        const overdue =
          hasFollowUp &&
          !followUpDone &&
          followUpDue !== null &&
          followUpDue < today;

        return (
          <li
            key={d.id}
            className={cn(
              "rounded-lg border bg-card p-4",
              followUpDone && "opacity-70",
            )}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {d.decided_on}
                  {d.owner ? (
                    <>
                      {" · "}
                      {d.owner.full_name ?? d.owner.email ?? "Owner"}
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-sm font-medium leading-snug">
                  {d.title}
                </p>
                {d.context ? (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Context
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {d.context}
                    </p>
                  </div>
                ) : null}
                <div className="mt-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Decision
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm">
                    {d.decision}
                  </p>
                </div>
                {hasFollowUp ? (
                  <div className="mt-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Follow-up
                      {d.follow_up_due ? ` · due ${d.follow_up_due}` : null}
                      {overdue ? (
                        <span className="ml-1 text-rose-600">· overdue</span>
                      ) : null}
                    </p>
                    <p
                      className={cn(
                        "mt-1 whitespace-pre-wrap text-sm",
                        followUpDone &&
                          "text-muted-foreground line-through",
                      )}
                    >
                      {d.follow_up}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-1">
                {hasFollowUp ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleDone(d.id, !followUpDone)}
                    disabled={pending}
                    className="h-8 w-8"
                    aria-label={followUpDone ? "Reopen follow-up" : "Mark follow-up done"}
                    title={followUpDone ? "Reopen follow-up" : "Mark follow-up done"}
                  >
                    {followUpDone ? (
                      <RotateCcw className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(d.id)}
                  disabled={pending}
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

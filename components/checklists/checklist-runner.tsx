"use client";

import { useMemo, useState, useTransition } from "react";
import { Check, CheckCircle2, RotateCcw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  completeChecklistRun,
  reopenChecklistRun,
  setChecklistItemState,
} from "@/components/checklists/actions";
import type {
  Checklist,
  ChecklistCompletion,
  ChecklistItem,
  ChecklistItemCompletion,
} from "@/lib/types/database";

interface ChecklistRunnerProps {
  checklist: Checklist;
  items: ChecklistItem[];
  completion: ChecklistCompletion;
  initialItemCompletions: ChecklistItemCompletion[];
}

interface RowState {
  checked: boolean;
  note: string;
}

export function ChecklistRunner({
  checklist,
  items,
  completion,
  initialItemCompletions,
}: ChecklistRunnerProps) {
  const [done, setDone] = useState(completion.status === "completed");
  const [completionNotes, setCompletionNotes] = useState(completion.notes ?? "");
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const it of items) {
      const found = initialItemCompletions.find((ic) => ic.item_id === it.id);
      initial[it.id] = {
        checked: found?.checked ?? false,
        note: found?.note ?? "",
      };
    }
    return initial;
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const checkedCount = useMemo(
    () => Object.values(rows).filter((r) => r.checked).length,
    [rows],
  );
  const total = items.length;
  const allChecked = total > 0 && checkedCount === total;

  function persist(itemId: string, next: RowState) {
    startTransition(async () => {
      const res = await setChecklistItemState({
        completionId: completion.id,
        itemId,
        checked: next.checked,
        note: next.note || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
      }
    });
  }

  function toggle(itemId: string) {
    if (done) return;
    setError(null);
    setRows((prev) => {
      const next = { ...prev[itemId], checked: !prev[itemId].checked };
      persist(itemId, next);
      return { ...prev, [itemId]: next };
    });
  }

  function updateNote(itemId: string, note: string) {
    if (done) return;
    setRows((prev) => ({ ...prev, [itemId]: { ...prev[itemId], note } }));
  }

  function commitNote(itemId: string) {
    if (done) return;
    persist(itemId, rows[itemId]);
  }

  function submitComplete() {
    setError(null);
    startTransition(async () => {
      const res = await completeChecklistRun({
        completionId: completion.id,
        notes: completionNotes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDone(true);
    });
  }

  function reopen() {
    setError(null);
    startTransition(async () => {
      const res = await reopenChecklistRun(completion.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDone(false);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {checkedCount} / {total} complete
          </p>
          <div className="mt-1 h-2 w-48 max-w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-emerald-500 transition-[width]"
              style={{
                width: total === 0 ? "0%" : `${(checkedCount / total) * 100}%`,
              }}
            />
          </div>
        </div>
        {done ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Completed
          </span>
        ) : null}
      </div>

      <ul className="space-y-2">
        {items.map((item) => {
          const state = rows[item.id];
          const noteRequiredMissing =
            item.requires_note &&
            state.checked &&
            (state.note ?? "").trim().length === 0;
          return (
            <li
              key={item.id}
              className={cn(
                "rounded-lg border bg-card transition-colors",
                state.checked
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border",
                done && "opacity-80",
              )}
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                disabled={done || pending}
                className={cn(
                  "flex w-full items-start gap-3 p-3 text-left",
                  done ? "cursor-default" : "cursor-pointer",
                )}
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                    state.checked
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-input bg-background",
                  )}
                  aria-hidden
                >
                  {state.checked ? <Check className="h-4 w-4" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block text-base leading-snug",
                      state.checked && "text-muted-foreground line-through",
                    )}
                  >
                    {item.label}
                  </span>
                  {item.requires_note ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Note required
                    </span>
                  ) : null}
                </span>
              </button>

              {state.checked || item.requires_note ? (
                <div className="border-t px-3 py-2">
                  <Textarea
                    rows={2}
                    placeholder={
                      item.requires_note
                        ? "Add a note (required)"
                        : "Optional note"
                    }
                    value={state.note}
                    onChange={(e) => updateNote(item.id, e.target.value)}
                    onBlur={() => commitNote(item.id)}
                    disabled={done || pending}
                    className="text-sm"
                  />
                  {noteRequiredMissing ? (
                    <p className="mt-1 text-xs text-destructive">
                      A note is required before completing.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <div className="space-y-2">
        <label className="text-sm font-medium">Closing notes</label>
        <Textarea
          rows={3}
          placeholder="Anything the next shift needs to know about this run?"
          value={completionNotes}
          onChange={(e) => setCompletionNotes(e.target.value)}
          disabled={done || pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {done ? (
          <Button
            type="button"
            variant="outline"
            onClick={reopen}
            disabled={pending}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reopen
          </Button>
        ) : (
          <Button
            type="button"
            onClick={submitComplete}
            disabled={pending || !allChecked || hasMissingRequiredNote(items, rows)}
            className="gap-2"
            size="lg"
          >
            <CheckCircle2 className="h-4 w-4" />
            {pending ? "Saving…" : "Mark complete"}
          </Button>
        )}
      </div>

      {!allChecked && !done ? (
        <p className="text-center text-xs text-muted-foreground">
          Check every item to mark this run complete.
        </p>
      ) : null}
    </div>
  );
}

function hasMissingRequiredNote(
  items: ChecklistItem[],
  rows: Record<string, RowState>,
) {
  return items.some(
    (it) =>
      it.requires_note &&
      rows[it.id]?.checked &&
      (rows[it.id]?.note ?? "").trim().length === 0,
  );
}

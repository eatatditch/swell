"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createShiftNote,
  deleteShiftNote,
} from "@/components/daily-ops/logs/actions";
import {
  HANDOFF_SHIFTS,
  SHIFT_LABELS,
  todayISO,
} from "@/lib/constants/daily-ops";
import type { HandoffShift, ProfileLite, ShiftNote } from "@/lib/types/database";

interface ShiftHandoffPanelProps {
  locationId: string;
  currentUserId: string;
  notes: (ShiftNote & { author: ProfileLite | null })[];
}

export function ShiftHandoffPanel({
  locationId,
  currentUserId,
  notes,
}: ShiftHandoffPanelProps) {
  const router = useRouter();
  const [fromShift, setFromShift] = useState<HandoffShift>("am");
  const [toShift, setToShift] = useState<HandoffShift>("pm");
  const [body, setBody] = useState("");
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError("Body is required");
      return;
    }
    if (fromShift === toShift) {
      setError("From and to must be different shifts");
      return;
    }
    startTransition(async () => {
      const res = await createShiftNote({
        locationId,
        noteDate: date,
        fromShift,
        toShift,
        body,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setBody("");
      router.refresh();
    });
  }

  function remove(noteId: string) {
    startTransition(async () => {
      const res = await deleteShiftNote(noteId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <p className="text-sm font-medium">New handoff</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="hn-date">Date</Label>
            <Input
              id="hn-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hn-from">From</Label>
            <select
              id="hn-from"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={fromShift}
              onChange={(e) => setFromShift(e.target.value as HandoffShift)}
              disabled={pending}
            >
              {HANDOFF_SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {SHIFT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="hn-to">To</Label>
            <select
              id="hn-to"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={toShift}
              onChange={(e) => setToShift(e.target.value as HandoffShift)}
              disabled={pending}
            >
              {HANDOFF_SHIFTS.map((s) => (
                <option key={s} value={s}>
                  {SHIFT_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Textarea
          rows={3}
          placeholder="Short, structured handoff. What does the next shift need to know?"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={pending}
        />
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending || !body.trim()}>
            {pending ? "Saving…" : "Post handoff"}
          </Button>
        </div>
      </div>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No handoffs yet for this view.
        </p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="flex items-start gap-3 rounded-lg border bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {n.note_date} · {SHIFT_LABELS[n.from_shift]} →{" "}
                  {SHIFT_LABELS[n.to_shift]} ·{" "}
                  {n.author?.full_name ?? n.author?.email ?? "Someone"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">
                  {n.body}
                </p>
              </div>
              {n.author_id === currentUserId ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(n.id)}
                  disabled={pending}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

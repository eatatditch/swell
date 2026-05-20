"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createManagerLog } from "@/components/daily-ops/logs/actions";
import {
  EMPTY_SHIFT_NUMBERS,
  ShiftNumbersFields,
  ShiftNumbersState,
  toCents,
  toGuestCount,
} from "@/components/daily-ops/logs/shift-numbers-fields";
import {
  SHIFTS,
  SHIFT_LABELS,
  todayISO,
} from "@/lib/constants/daily-ops";
import type { Shift } from "@/lib/types/database";

interface ManagerLogComposerProps {
  locationId: string;
}

export function ManagerLogComposer({ locationId }: ManagerLogComposerProps) {
  const router = useRouter();
  const [date, setDate] = useState(todayISO());
  const [shift, setShift] = useState<Shift>(currentShift());
  const [numbers, setNumbers] = useState<ShiftNumbersState>(EMPTY_SHIFT_NUMBERS);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasAnyNumber =
    numbers.sales !== "" ||
    numbers.guests !== "" ||
    numbers.comps !== "" ||
    numbers.voids !== "";
  const canSubmit = notes.trim().length > 0 || hasAnyNumber;

  function submit() {
    setError(null);
    if (!canSubmit) {
      setError("Add notes or at least one number");
      return;
    }
    startTransition(async () => {
      const res = await createManagerLog({
        locationId,
        logDate: date,
        shift,
        notes: notes.trim() || null,
        salesCents: toCents(numbers.sales),
        guestCount: toGuestCount(numbers.guests),
        compsCents: toCents(numbers.comps),
        voidsCents: toCents(numbers.voids),
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setNotes("");
      setNumbers(EMPTY_SHIFT_NUMBERS);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="ml-date">Date</Label>
          <Input
            id="ml-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ml-shift">Shift</Label>
          <select
            id="ml-shift"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={shift}
            onChange={(e) => setShift(e.target.value as Shift)}
            disabled={pending}
          >
            {SHIFTS.map((s) => (
              <option key={s} value={s}>
                {SHIFT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Numbers</p>
        <ShiftNumbersFields
          value={numbers}
          onChange={setNumbers}
          disabled={pending}
          idPrefix="ml"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ml-notes">Notes</Label>
        <Textarea
          id="ml-notes"
          rows={5}
          placeholder="VIPs, comps, problems, wins. Anything narrative."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
        />
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button
          variant="accent"
          onClick={submit}
          disabled={pending || !canSubmit}
        >
          {pending ? "Saving…" : "Post log"}
        </Button>
      </div>
    </div>
  );
}

function currentShift(): Shift {
  const h = new Date().getHours();
  if (h < 15) return "am";
  return "pm";
}

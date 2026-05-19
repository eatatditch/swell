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
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError("Body is required");
      return;
    }
    startTransition(async () => {
      const res = await createManagerLog({
        locationId,
        logDate: date,
        shift,
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

  return (
    <div className="space-y-3">
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
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
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
      <Textarea
        rows={5}
        placeholder="What happened on this shift? Cover counts, VIPs, comps, problems, wins."
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

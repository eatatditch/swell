"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateLocationHoursAction } from "@/components/admin/settings/actions";
import type { Location, LocationHours } from "@/lib/types/database";

interface HoursFormProps {
  location: Location & { hours: LocationHours[] };
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface DayState {
  openTime: string;
  closeTime: string;
  isClosed: boolean;
}

function trimSeconds(time: string | null): string {
  if (!time) return "";
  // Postgres time comes back as HH:MM:SS; the time input wants HH:MM.
  return time.slice(0, 5);
}

export function HoursForm({ location }: HoursFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const initial: Record<number, DayState> = {};
  for (const day of DAYS) {
    const existing = location.hours.find((h) => h.day_of_week === day.value);
    initial[day.value] = {
      openTime: trimSeconds(existing?.open_time ?? null),
      closeTime: trimSeconds(existing?.close_time ?? null),
      isClosed: existing?.is_closed ?? false,
    };
  }
  const [state, setState] = useState(initial);

  function update(dayOfWeek: number, patch: Partial<DayState>) {
    setState((s) => ({ ...s, [dayOfWeek]: { ...s[dayOfWeek], ...patch } }));
  }

  function submit() {
    setError(null);
    setOkMessage(null);
    const days = DAYS.map((d) => ({
      dayOfWeek: d.value,
      openTime: state[d.value].openTime || null,
      closeTime: state[d.value].closeTime || null,
      isClosed: state[d.value].isClosed,
    }));
    startTransition(async () => {
      const res = await updateLocationHoursAction(location.id, days);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Hours saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {okMessage ? (
        <Alert>
          <AlertDescription>{okMessage}</AlertDescription>
        </Alert>
      ) : null}

      <div className="divide-y rounded-md border">
        {DAYS.map((d) => {
          const day = state[d.value];
          return (
            <div
              key={d.value}
              className="grid grid-cols-[100px,1fr] items-center gap-3 px-4 py-3 sm:grid-cols-[140px,auto,1fr,auto]"
            >
              <div className="text-sm font-medium">{d.label}</div>
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={day.isClosed}
                  onChange={(e) => update(d.value, { isClosed: e.target.checked })}
                  disabled={pending}
                  className="h-3.5 w-3.5"
                />
                Closed
              </label>
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Input
                  type="time"
                  value={day.openTime}
                  onChange={(e) => update(d.value, { openTime: e.target.value })}
                  disabled={pending || day.isClosed}
                  className="w-28"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={day.closeTime}
                  onChange={(e) => update(d.value, { closeTime: e.target.value })}
                  disabled={pending || day.isClosed}
                  className="w-28"
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : `Save ${location.name} hours`}
        </Button>
      </div>
    </div>
  );
}

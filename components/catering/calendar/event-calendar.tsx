"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
  formatTime,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { EventWithRefs } from "@/lib/server/catering";

interface EventCalendarProps {
  year: number;
  month: number; // 0-indexed
  events: EventWithRefs[];
  locationColors: Record<string, string>;
}

const LOCATION_DOT_DEFAULT = "bg-muted-foreground";

export function EventCalendar({
  year,
  month,
  events,
  locationColors,
}: EventCalendarProps) {
  const router = useRouter();
  const params = useSearchParams();

  const first = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0).getDate();
  const startDayOfWeek = first.getDay();
  const totalCells = Math.ceil((startDayOfWeek + lastDay) / 7) * 7;

  const eventsByDate = new Map<string, EventWithRefs[]>();
  for (const e of events) {
    const key = e.event_date;
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)?.push(e);
  }

  function buildHref(deltaMonth: number) {
    const d = new Date(year, month + deltaMonth, 1);
    const next = new URLSearchParams(params);
    next.set("year", String(d.getFullYear()));
    next.set("month", String(d.getMonth()));
    return `?${next.toString()}`;
  }

  function gotoToday() {
    const today = new Date();
    const next = new URLSearchParams(params);
    next.set("year", String(today.getFullYear()));
    next.set("month", String(today.getMonth()));
    router.push(`?${next.toString()}`);
  }

  const monthLabel = first.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0",
  )}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-xl font-black">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="icon" aria-label="Previous month">
            <Link href={buildHref(-1)}>
              <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={gotoToday}>
            Today
          </Button>
          <Button asChild variant="ghost" size="icon" aria-label="Next month">
            <Link href={buildHref(1)}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-border bg-border text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div
            key={d}
            className="bg-muted/50 px-2 py-1 text-center font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {d}
          </div>
        ))}

        {Array.from({ length: totalCells }, (_, i) => {
          const dayNum = i - startDayOfWeek + 1;
          const inMonth = dayNum >= 1 && dayNum <= lastDay;
          const cellDate = new Date(year, month, dayNum);
          const key = `${cellDate.getFullYear()}-${String(
            cellDate.getMonth() + 1,
          ).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;
          const dayEvents = eventsByDate.get(key) ?? [];
          const isToday = key === todayKey;
          return (
            <div
              key={i}
              className={cn(
                "min-h-24 bg-card p-1.5 align-top",
                !inMonth && "bg-muted/30 text-muted-foreground/50",
              )}
            >
              {inMonth ? (
                <>
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs font-semibold tabular-nums",
                        isToday
                          ? "bg-accent text-accent-foreground"
                          : "text-foreground",
                      )}
                    >
                      {dayNum}
                    </span>
                    {dayEvents.length > 0 ? (
                      <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">
                        {dayEvents.length}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((e) => (
                      <Link
                        key={e.id}
                        href={`/catering/events/${e.id}`}
                        className={cn(
                          "block truncate rounded-md border border-transparent px-1.5 py-0.5 text-[11px] font-medium leading-tight",
                          EVENT_STATUS_COLORS[e.status],
                        )}
                        title={`${e.title} · ${EVENT_STATUS_LABELS[e.status]}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          <span
                            className={cn(
                              "inline-block h-1.5 w-1.5 rounded-full",
                              locationColors[e.location_id] ??
                                LOCATION_DOT_DEFAULT,
                            )}
                          />
                          {e.start_time ? `${formatTime(e.start_time)} ` : ""}
                          {e.title}
                        </span>
                      </Link>
                    ))}
                    {dayEvents.length > 3 ? (
                      <Link
                        href={`/catering/events?from=${key}&to=${key}`}
                        className="block text-[11px] text-muted-foreground underline-offset-2 hover:underline"
                      >
                        +{dayEvents.length - 3} more
                      </Link>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

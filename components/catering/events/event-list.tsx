import Link from "next/link";
import { CalendarCheck } from "lucide-react";

import {
  EventStatusBadge,
  PaymentStatusBadge,
} from "@/components/catering/status-badges";
import { EmptyState } from "@/components/data/empty-state";
import {
  formatCents,
  formatEventDate,
  formatTime,
  SERVICE_TYPE_LABELS,
} from "@/lib/constants/catering";
import type { EventWithRefs } from "@/lib/server/catering";

interface EventListProps {
  events: EventWithRefs[];
  balanceByEvent: Record<string, number>;
}

export function EventList({ events, balanceByEvent }: EventListProps) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon={CalendarCheck}
        title="No events match"
        description="Adjust the filters or create your first event."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="py-2 pr-3">Date</th>
            <th className="py-2 pr-3">Event</th>
            <th className="py-2 pr-3">Venue</th>
            <th className="py-2 pr-3">Guests</th>
            <th className="py-2 pr-3">Status</th>
            <th className="py-2 pr-3 text-right">Balance</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {events.map((e) => {
            const bal = balanceByEvent[e.id] ?? e.total_quoted_cents;
            return (
              <tr key={e.id} className="align-top hover:bg-muted/30">
                <td className="py-3 pr-3">
                  <Link
                    href={`/catering/events/${e.id}`}
                    className="block text-sm font-medium tabular-nums hover:underline"
                  >
                    {formatEventDate(e.event_date)}
                  </Link>
                  {e.start_time ? (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(e.start_time)}
                    </span>
                  ) : null}
                </td>
                <td className="py-3 pr-3">
                  <Link
                    href={`/catering/events/${e.id}`}
                    className="block font-medium hover:underline"
                  >
                    {e.title}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {SERVICE_TYPE_LABELS[e.service_type]}
                    {e.location ? ` · ${e.location.name}` : ""}
                  </span>
                </td>
                <td className="py-3 pr-3 text-sm">
                  {e.venue ?? <span className="text-muted-foreground">—</span>}
                </td>
                <td className="py-3 pr-3 text-sm tabular-nums">
                  {e.guest_count ?? "—"}
                </td>
                <td className="py-3 pr-3">
                  <EventStatusBadge status={e.status} />
                </td>
                <td className="py-3 pr-3 text-right">
                  <div className="text-sm font-medium tabular-nums">
                    {formatCents(bal)}
                  </div>
                  {bal === 0 && e.total_quoted_cents > 0 ? (
                    <PaymentStatusBadge status="received" className="mt-1" />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

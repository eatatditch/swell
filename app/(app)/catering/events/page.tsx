import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventList } from "@/components/catering/events/event-list";
import { requireUser } from "@/lib/auth/get-user";
import { listEvents } from "@/lib/server/catering";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { CateringEventStatus } from "@/lib/types/database";

interface PageProps {
  searchParams: {
    status?: string;
    location?: string;
    from?: string;
    to?: string;
  };
}

export default async function CateringEventsPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();

  const filterLocationId = searchParams.location || "";
  const status =
    searchParams.status &&
    EVENT_STATUSES.includes(searchParams.status as CateringEventStatus)
      ? (searchParams.status as CateringEventStatus)
      : ("all" as const);

  const events = await listEvents({
    locationId: filterLocationId || null,
    status,
    from: searchParams.from,
    to: searchParams.to,
  });

  const supabase = createSupabaseServerClient();
  const ids = events.map((e) => e.id);
  let balanceByEvent: Record<string, number> = {};
  if (ids.length > 0) {
    const { data: payments } = await supabase
      .from("event_payments")
      .select("event_id, amount_cents, status, kind")
      .in("event_id", ids);

    const receivedByEvent: Record<string, number> = {};
    for (const p of payments ?? []) {
      const id = (p as { event_id: string }).event_id;
      if ((p as { status: string }).status === "received") {
        receivedByEvent[id] =
          (receivedByEvent[id] ?? 0) +
          (p as { amount_cents: number }).amount_cents;
      } else if ((p as { kind: string }).kind === "refund") {
        receivedByEvent[id] =
          (receivedByEvent[id] ?? 0) -
          (p as { amount_cents: number }).amount_cents;
      }
    }

    balanceByEvent = Object.fromEntries(
      events.map((e) => [
        e.id,
        Math.max(0, e.total_quoted_cents - (receivedByEvent[e.id] ?? 0)),
      ]),
    );
  }

  return (
    <>
      <PageHeader
        title="Events"
        description="Booked and upcoming events."
        action={
          <Button asChild variant="accent" size="sm" className="gap-1.5">
            <Link href="/catering/events/new">
              <Plus className="h-4 w-4" />
              New event
            </Link>
          </Button>
        }
      />

      <form className="mb-4 flex flex-wrap items-center gap-2" action="">
        <select
          name="location"
          defaultValue={filterLocationId}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="">All locations</option>
          {locations
            .filter((l) => l.slug !== "company_wide")
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
        </select>
        <select
          name="status"
          defaultValue={status}
          className="h-9 rounded-full border border-input bg-background px-3 text-xs"
        >
          <option value="all">All statuses</option>
          {EVENT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <Input
          type="date"
          name="from"
          defaultValue={searchParams.from ?? ""}
          className="h-9 w-auto"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="date"
          name="to"
          defaultValue={searchParams.to ?? ""}
          className="h-9 w-auto"
        />
        <Button type="submit" variant="outline" size="sm">
          Filter
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/catering/events">Clear</Link>
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {events.length} {events.length === 1 ? "event" : "events"}
          </CardTitle>
          <CardDescription>
            {status === "all" ? "All statuses" : EVENT_STATUS_LABELS[status]}
            {filterLocationId
              ? " · " +
                (locations.find((l) => l.id === filterLocationId)?.name ??
                  "location")
              : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventList events={events} balanceByEvent={balanceByEvent} />
        </CardContent>
      </Card>
    </>
  );
}

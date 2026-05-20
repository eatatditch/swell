import { PageHeader } from "@/components/layout/page-header";
import { EventCalendar } from "@/components/catering/calendar/event-calendar";
import { requireUser } from "@/lib/auth/get-user";
import { listEvents } from "@/lib/server/catering";
import {
  EVENT_STATUS_COLORS,
  EVENT_STATUS_LABELS,
} from "@/lib/constants/catering";

const LOCATION_COLOR_BY_SLUG: Record<string, string> = {
  bay_shore: "bg-primary",
  port_jefferson: "bg-accent",
  kings_park: "bg-emerald-500",
};

interface PageProps {
  searchParams: {
    year?: string;
    month?: string;
    location?: string;
  };
}

export default async function CateringCalendarPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();

  const today = new Date();
  const year = searchParams.year
    ? Number.parseInt(searchParams.year, 10)
    : today.getFullYear();
  const month =
    searchParams.month != null
      ? Number.parseInt(searchParams.month, 10)
      : today.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  const from = monthStart.toISOString().slice(0, 10);
  const to = monthEnd.toISOString().slice(0, 10);

  const events = await listEvents({
    locationId: searchParams.location || null,
    from,
    to,
  });

  const locationColors: Record<string, string> = {};
  for (const loc of locations) {
    locationColors[loc.id] =
      LOCATION_COLOR_BY_SLUG[loc.slug] ?? "bg-muted-foreground";
  }

  return (
    <>
      <PageHeader
        title="Calendar"
        description="Month view of all events across locations."
      />

      <form
        action=""
        className="mb-4 flex flex-wrap items-center gap-2 print:hidden"
      >
        <select
          name="location"
          defaultValue={searchParams.location ?? ""}
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
        <input type="hidden" name="year" value={year} />
        <input type="hidden" name="month" value={month} />
        <button
          type="submit"
          className="rounded-full border border-input bg-card px-3 py-1 text-xs"
        >
          Filter
        </button>
      </form>

      <EventCalendar
        year={year}
        month={month}
        events={events}
        locationColors={locationColors}
      />

      <div className="mt-6 flex flex-wrap items-center gap-4 text-xs">
        <div className="space-x-1">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            Status:
          </span>
          {Object.entries(EVENT_STATUS_LABELS).map(([k, label]) => (
            <span
              key={k}
              className={`inline-flex items-center rounded-full px-2 py-0.5 ${
                EVENT_STATUS_COLORS[k as keyof typeof EVENT_STATUS_COLORS]
              }`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="space-x-1">
          <span className="font-semibold uppercase tracking-wide text-muted-foreground">
            Locations:
          </span>
          {locations
            .filter((l) => l.slug !== "company_wide")
            .map((l) => (
              <span key={l.id} className="inline-flex items-center gap-1">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${locationColors[l.id]}`}
                />
                {l.name}
              </span>
            ))}
        </div>
      </div>
    </>
  );
}

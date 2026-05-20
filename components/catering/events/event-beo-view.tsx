import {
  formatCents,
  formatEventDate,
  formatTime,
  MENU_CATEGORY_LABELS,
  SERVICE_TYPE_LABELS,
} from "@/lib/constants/catering";
import type {
  CateringEvent,
  EventMenuItem,
} from "@/lib/types/database";

interface EventBEOViewProps {
  event: CateringEvent & {
    location?: { name: string } | null;
  };
  menuItems: EventMenuItem[];
}

export function EventBEOView({ event, menuItems }: EventBEOViewProps) {
  const total = menuItems.reduce((acc, m) => acc + m.total_cents, 0);
  const grouped = new Map<string, EventMenuItem[]>();
  for (const m of menuItems) {
    if (!grouped.has(m.category)) grouped.set(m.category, []);
    grouped.get(m.category)?.push(m);
  }

  return (
    <article className="space-y-6 rounded-2xl border bg-card p-6 print:rounded-none print:border-0 print:p-0 print:shadow-none">
      <header className="border-b pb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          Banquet Event Order
        </p>
        <h2 className="font-display text-2xl font-black leading-tight">
          {event.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {formatEventDate(event.event_date)}
          {event.start_time
            ? ` · ${formatTime(event.start_time)}${
                event.end_time ? `–${formatTime(event.end_time)}` : ""
              }`
            : ""}
          {event.location ? ` · ${event.location.name}` : ""}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Fact label="Service">{SERVICE_TYPE_LABELS[event.service_type]}</Fact>
        <Fact label="Guest count">
          {event.guest_count ?? "—"}
          {event.headcount_confirmed_at ? (
            <span className="ml-2 text-xs text-muted-foreground">
              (confirmed)
            </span>
          ) : null}
        </Fact>
        <Fact label="Venue">
          {event.venue ?? "—"}
          {event.room ? ` · ${event.room}` : ""}
        </Fact>
        <Fact label="Total quoted">
          {formatCents(event.total_quoted_cents)}
        </Fact>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Box title="Client contact">
          {event.contact_name ? <p>{event.contact_name}</p> : null}
          {event.contact_phone ? (
            <p className="text-sm">{event.contact_phone}</p>
          ) : null}
          {event.contact_email ? (
            <p className="text-sm">{event.contact_email}</p>
          ) : null}
          {!event.contact_name && !event.contact_phone && !event.contact_email ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : null}
        </Box>
        <Box title="Billing">
          {event.billing_name ? <p>{event.billing_name}</p> : null}
          {event.billing_address ? (
            <p className="whitespace-pre-wrap text-sm">{event.billing_address}</p>
          ) : null}
          {!event.billing_name && !event.billing_address ? (
            <p className="text-sm text-muted-foreground">—</p>
          ) : null}
        </Box>
      </section>

      <section>
        <h3 className="mb-3 font-display text-lg font-bold">Menu</h3>
        {menuItems.length === 0 ? (
          <p className="text-sm text-muted-foreground">No items yet.</p>
        ) : (
          <div className="space-y-4">
            {Array.from(grouped.entries()).map(([cat, items]) => (
              <div key={cat}>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {MENU_CATEGORY_LABELS[cat as keyof typeof MENU_CATEGORY_LABELS]}
                </p>
                <table className="w-full text-sm">
                  <thead className="border-b text-xs text-muted-foreground">
                    <tr>
                      <th className="py-1 pr-2 text-left">Item</th>
                      <th className="py-1 pr-2 text-right">Qty</th>
                      <th className="py-1 pr-2 text-right">Unit</th>
                      <th className="py-1 pr-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {items.map((it) => (
                      <tr key={it.id}>
                        <td className="py-1.5 pr-2">
                          <p className="font-medium">{it.name}</p>
                          {it.description ? (
                            <p className="text-xs text-muted-foreground">
                              {it.description}
                            </p>
                          ) : null}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {it.quantity}
                        </td>
                        <td className="py-1.5 pr-2 text-right tabular-nums">
                          {formatCents(it.unit_price_cents)}
                        </td>
                        <td className="py-1.5 pr-2 text-right font-medium tabular-nums">
                          {formatCents(it.total_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
            <div className="flex justify-end border-t pt-2 text-sm">
              <span className="mr-3 text-xs uppercase tracking-wide text-muted-foreground">
                Subtotal
              </span>
              <span className="font-semibold tabular-nums">
                {formatCents(total)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {event.allergens_notes ? (
          <Box title="Allergens / dietary">
            <p className="whitespace-pre-wrap text-sm">{event.allergens_notes}</p>
          </Box>
        ) : null}
        {event.special_requests ? (
          <Box title="Special requests">
            <p className="whitespace-pre-wrap text-sm">
              {event.special_requests}
            </p>
          </Box>
        ) : null}
        {event.setup_notes ? (
          <Box title="Setup">
            <p className="whitespace-pre-wrap text-sm">{event.setup_notes}</p>
          </Box>
        ) : null}
        {event.breakdown_notes ? (
          <Box title="Breakdown">
            <p className="whitespace-pre-wrap text-sm">{event.breakdown_notes}</p>
          </Box>
        ) : null}
        {event.equipment_notes ? (
          <Box title="Equipment">
            <p className="whitespace-pre-wrap text-sm">{event.equipment_notes}</p>
          </Box>
        ) : null}
        {event.staffing_notes ? (
          <Box title="Staffing">
            <p className="whitespace-pre-wrap text-sm">{event.staffing_notes}</p>
          </Box>
        ) : null}
        {event.beverage_notes ? (
          <Box title="Beverage">
            <p className="whitespace-pre-wrap text-sm">{event.beverage_notes}</p>
          </Box>
        ) : null}
      </section>

      {event.internal_notes ? (
        <section className="rounded-lg border border-dashed border-border bg-muted/30 p-3 print:hidden">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Internal notes
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm">
            {event.internal_notes}
          </p>
        </section>
      ) : null}
    </article>
  );
}

function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  );
}

function Box({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3 print:bg-transparent">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

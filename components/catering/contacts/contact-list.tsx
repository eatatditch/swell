import Link from "next/link";
import { Mail, Phone, Users } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import type { ContactWithStats } from "@/lib/server/catering";

export function ContactList({ contacts }: { contacts: ContactWithStats[] }) {
  if (contacts.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No contacts yet"
        description="Add a contact to start tracking catering customers and link them to leads, quotes, and events."
      />
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Company</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3 text-right">Deals</th>
            <th className="px-4 py-3 text-right">Events</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((c) => (
            <tr
              key={c.id}
              className="border-b border-border last:border-b-0 hover:bg-muted/30"
            >
              <td className="px-4 py-3">
                <Link
                  href={`/catering/contacts/${c.id}`}
                  className="font-medium hover:text-accent"
                >
                  {c.full_name}
                </Link>
                {c.title ? (
                  <p className="text-xs text-muted-foreground">{c.title}</p>
                ) : null}
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {c.company ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  {c.email ? (
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {c.email}
                    </span>
                  ) : null}
                  {c.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {c.phone}
                    </span>
                  ) : null}
                  {!c.email && !c.phone ? <span>—</span> : null}
                </div>
              </td>
              <td className="px-4 py-3 text-right tabular-nums">{c.lead_count}</td>
              <td className="px-4 py-3 text-right tabular-nums">{c.event_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

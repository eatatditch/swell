import Link from "next/link";
import { Calendar, Users } from "lucide-react";

import { LeadStatusBadge } from "@/components/catering/status-badges";
import { formatCents, formatEventDate } from "@/lib/constants/catering";
import type { LeadWithOwner } from "@/lib/server/catering";

export function LeadCard({ lead }: { lead: LeadWithOwner }) {
  const budget =
    lead.budget_low_cents != null && lead.budget_high_cents != null
      ? `${formatCents(lead.budget_low_cents)} – ${formatCents(lead.budget_high_cents)}`
      : lead.budget_low_cents != null
        ? `${formatCents(lead.budget_low_cents)}+`
        : lead.budget_high_cents != null
          ? `Up to ${formatCents(lead.budget_high_cents)}`
          : null;

  return (
    <Link
      href={`/catering/leads/${lead.id}`}
      className="block rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {lead.contact_name}
          </p>
          {lead.company ? (
            <p className="truncate text-xs text-muted-foreground">
              {lead.company}
            </p>
          ) : null}
        </div>
        <LeadStatusBadge status={lead.status} className="shrink-0" />
      </div>

      {lead.event_type ? (
        <p className="mt-2 truncate text-xs text-muted-foreground">
          {lead.event_type}
        </p>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        {lead.desired_date ? (
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatEventDate(lead.desired_date)}
          </span>
        ) : null}
        {lead.party_size != null ? (
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {lead.party_size}
          </span>
        ) : null}
        {budget ? <span className="tabular-nums">{budget}</span> : null}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {lead.owner?.full_name ??
            lead.owner?.email ??
            (lead.creator
              ? `by ${lead.creator.full_name ?? lead.creator.email}`
              : "Unassigned")}
        </span>
        {lead.location ? <span>{lead.location.name}</span> : null}
      </div>
    </Link>
  );
}

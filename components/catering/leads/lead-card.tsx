import { Calendar, Users } from "lucide-react";

import { formatCents, formatEventDate } from "@/lib/constants/catering";
import {
  SOURCE_CHANNEL_BADGE,
  SOURCE_CHANNEL_LABELS,
} from "@/lib/forms/schema";
import type { LeadWithOwner } from "@/lib/server/catering";
import { cn } from "@/lib/utils";

export function LeadCardBody({ lead }: { lead: LeadWithOwner }) {
  const contact = lead.contact;
  const value =
    lead.estimated_value_cents != null
      ? formatCents(lead.estimated_value_cents)
      : "$0.00";

  return (
    <>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold leading-tight">
          {contact.full_name}
          {lead.event_type ? ` · ${lead.event_type}` : ""}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {contact.company ?? contact.full_name}
        </p>
      </div>

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
      </div>

      {lead.source_form ? (
        <span
          title={
            lead.source_form.source_label ?? lead.source_form.name
          }
          className={cn(
            "mt-2 inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[10px] font-semibold",
            SOURCE_CHANNEL_BADGE[lead.source_form.source_channel],
          )}
        >
          {SOURCE_CHANNEL_LABELS[lead.source_form.source_channel]}
          {lead.source_form.source_label
            ? ` · ${lead.source_form.source_label}`
            : ""}
        </span>
      ) : lead.source ? (
        <span className="mt-2 inline-flex max-w-full truncate rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
          {lead.source}
        </span>
      ) : null}

      <p className="mt-2 text-base font-semibold tabular-nums">{value}</p>
    </>
  );
}

import { Inbox } from "lucide-react";

import { LeadCard } from "@/components/catering/leads/lead-card";
import { EmptyState } from "@/components/data/empty-state";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
} from "@/lib/constants/catering";
import type { LeadWithOwner } from "@/lib/server/catering";
import type { CateringLeadStatus } from "@/lib/types/database";

interface LeadPipelineProps {
  leads: LeadWithOwner[];
}

export function LeadPipeline({ leads }: LeadPipelineProps) {
  const grouped = new Map<CateringLeadStatus, LeadWithOwner[]>();
  for (const status of LEAD_STATUSES) grouped.set(status, []);
  for (const l of leads) {
    const arr = grouped.get(l.status);
    if (arr) arr.push(l);
  }

  if (leads.length === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="No leads yet"
        description="New inquiries will land here. Start the pipeline with a new lead."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {LEAD_STATUSES.map((s) => {
        const items = grouped.get(s) ?? [];
        return (
          <section
            key={s}
            className="flex min-h-[300px] flex-col gap-2 rounded-2xl border border-border bg-muted/30 p-3"
          >
            <header className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold tracking-wide text-foreground">
                {LEAD_STATUS_LABELS[s]}
              </h3>
              <span className="text-xs font-medium tabular-nums text-muted-foreground">
                {items.length}
              </span>
            </header>
            <div className="flex flex-col gap-2">
              {items.map((lead) => (
                <LeadCard key={lead.id} lead={lead} />
              ))}
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-card/40 px-3 py-4 text-center text-xs text-muted-foreground">
                  Empty
                </p>
              ) : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

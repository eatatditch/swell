import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  SOURCE_CHANNEL_BADGE,
  SOURCE_CHANNEL_LABELS,
  SOURCE_CHANNEL_ORDER,
} from "@/lib/forms/schema";
import { cn } from "@/lib/utils";
import type { LeadFormWithLocation } from "@/lib/server/lead-forms";
import type { FormSourceChannel } from "@/lib/types/database";

export function FormList({ forms }: { forms: LeadFormWithLocation[] }) {
  if (forms.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        No forms yet. Build one to embed on the marketing site — submissions
        land as catering leads in the pipeline.
      </p>
    );
  }

  // Roll-up of submissions by channel so the operator can see "X total IG, Y
  // total website" at a glance.
  const byChannel = new Map<FormSourceChannel, number>();
  for (const f of forms) {
    byChannel.set(
      f.source_channel,
      (byChannel.get(f.source_channel) ?? 0) + f.submission_count,
    );
  }
  const channelsWithData = SOURCE_CHANNEL_ORDER.filter(
    (c) => (byChannel.get(c) ?? 0) > 0,
  );

  return (
    <div className="space-y-4">
      {channelsWithData.length > 0 ? (
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Submissions by channel
          </p>
          <div className="flex flex-wrap gap-2">
            {channelsWithData.map((c) => (
              <span
                key={c}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
                  SOURCE_CHANNEL_BADGE[c],
                )}
              >
                {SOURCE_CHANNEL_LABELS[c]}
                <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[10px] font-bold">
                  {byChannel.get(c)}
                </span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {forms.map((f) => (
          <Link key={f.id} href={`/catering/forms/${f.id}`}>
            <Card className="h-full cursor-pointer transition hover:shadow-md">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{f.name}</CardTitle>
                    <CardDescription className="text-xs">
                      /{f.slug} · {f.location?.name ?? "—"}
                    </CardDescription>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                      f.active
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {f.active ? "Live" : "Off"}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    SOURCE_CHANNEL_BADGE[f.source_channel],
                  )}
                >
                  {SOURCE_CHANNEL_LABELS[f.source_channel]}
                  {f.source_label ? ` · ${f.source_label}` : ""}
                </span>
                <p>
                  {f.submission_count}{" "}
                  submission{f.submission_count === 1 ? "" : "s"}
                </p>
                {f.last_submission_at ? (
                  <p>
                    Last:{" "}
                    {new Date(f.last_submission_at).toLocaleDateString(
                      undefined,
                      { month: "short", day: "numeric" },
                    )}
                  </p>
                ) : (
                  <p>Never submitted</p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

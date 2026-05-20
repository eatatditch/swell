import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LeadFormWithLocation } from "@/lib/server/lead-forms";

export function FormList({ forms }: { forms: LeadFormWithLocation[] }) {
  if (forms.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        No forms yet. Build one to embed on the marketing site — submissions
        land as catering leads in the pipeline.
      </p>
    );
  }
  return (
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
            <CardContent className="space-y-1 text-xs text-muted-foreground">
              <p>
                {f.submission_count}{" "}
                submission{f.submission_count === 1 ? "" : "s"}
              </p>
              {f.last_submission_at ? (
                <p>
                  Last:{" "}
                  {new Date(f.last_submission_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              ) : (
                <p>Never submitted</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

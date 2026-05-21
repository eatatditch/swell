import { Star } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { REVIEWS, type ReviewSnippet } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function themeTone(t: ReviewSnippet["theme"]): string {
  switch (t) {
    case "praise":
      return "bg-emerald-500/15 text-emerald-700";
    case "complaint":
      return "bg-rose-500/10 text-rose-700";
    case "shoutout":
      return "bg-primary/15 text-primary";
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 font-display text-2xl font-black tabular-nums text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReviewsPage() {
  const counts = REVIEWS.reduce(
    (acc, r) => {
      acc[r.theme] += 1;
      return acc;
    },
    { praise: 0, complaint: 0, shoutout: 0 } as Record<
      ReviewSnippet["theme"],
      number
    >,
  );

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Recent Google and Yelp reviews. Shoutouts get reshared; complaints get a manager response."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat label="Praise" value={counts.praise} />
        <Stat label="Shoutouts" value={counts.shoutout} />
        <Stat label="Complaints" value={counts.complaint} />
      </div>

      <div className="space-y-4">
        {REVIEWS.map((r, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {r.source} · {r.location}
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className="flex" aria-label={`${r.stars} stars`}>
                      {Array.from({ length: r.stars }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="h-4 w-4 fill-amber-500 text-amber-500"
                        />
                      ))}
                      {Array.from({ length: 5 - r.stars }).map((_, idx) => (
                        <Star
                          key={`empty-${idx}`}
                          className="h-4 w-4 text-muted-foreground/40"
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {r.reviewer}
                    </span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      · {r.date}
                    </span>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${themeTone(
                    r.theme,
                  )}`}
                >
                  {r.theme}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-foreground">
                {r.body}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

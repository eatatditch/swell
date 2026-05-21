import { MapPin } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LOCAL_GUIDES } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

const CATEGORY_CHIPS = [
  "Events",
  "Local businesses",
  "Weekend guide",
  "Rainy-day guide",
  "Date-night guide",
  "Family guide",
  "Girls-night guide",
];

export default function LocalContentPage() {
  return (
    <div>
      <PageHeader
        title="Local Content"
        description="Town-by-town guides, what's happening this weekend, and the local angle. Built to be saved and shared."
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-foreground">
              Local content engine
            </h2>
          </div>
          <p className="mb-4 text-sm text-muted-foreground">
            Pick a category to draft a new local post. Each location should
            publish at least one guide per week.
          </p>
          <div className="flex flex-wrap gap-2">
            {CATEGORY_CHIPS.map((c) => (
              <span
                key={c}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {c}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {LOCAL_GUIDES.map((g) => (
          <Card key={g.location}>
            <CardContent className="space-y-4 p-5">
              <div>
                <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {g.location}
                </div>
                <h3 className="mt-1 font-display text-lg font-bold text-foreground">
                  {g.title}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Posting{" "}
                  <span className="tabular-nums">{g.postingDate}</span>
                </p>
              </div>

              <ul className="space-y-2 text-sm">
                {g.highlights.map((h, i) => (
                  <li key={i} className="flex gap-2">
                    <span
                      aria-hidden="true"
                      className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent"
                    />
                    <span className="text-foreground">{h}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

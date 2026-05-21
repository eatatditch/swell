import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { COMPETITORS } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

const STUDY_BRANDS = [
  "bartaco",
  "CAVA",
  "Chili's",
  "SERHANT.",
  "Little Joy",
  "Aviation Gin",
];

export default function CompetitorsPage() {
  return (
    <div>
      <PageHeader
        title="Competitors"
        description="What other brands are doing well and what we should steal — adapted for the Ditch voice."
      />

      <Card className="mb-6">
        <CardContent className="p-5">
          <h2 className="font-display text-base font-bold text-foreground">
            Brands to study
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Reference set — pull from these when stuck on voice, format, or
            cadence.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {STUDY_BRANDS.map((b) => (
              <span
                key={b}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
              >
                {b}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {COMPETITORS.map((c) => (
          <Card key={c.competitor + c.category}>
            <CardContent className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-foreground">
                  {c.competitor}
                </h3>
                <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent/15 text-accent">
                  {c.category}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.observation}
              </p>
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary">
                  Steal
                </div>
                <div className="mt-0.5 text-sm text-foreground">{c.steal}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

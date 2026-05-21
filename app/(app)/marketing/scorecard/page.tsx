import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SCORECARD, type ScorecardRow } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function dotClass(s: ScorecardRow["score"]): string {
  switch (s) {
    case "green":
      return "bg-emerald-500";
    case "yellow":
      return "bg-amber-500";
    case "red":
      return "bg-rose-500";
  }
}

function scoreLabel(s: ScorecardRow["score"]): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Tally({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${tone}`} />
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="mt-2 font-display text-3xl font-black tabular-nums text-foreground">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ScorecardPage() {
  const counts = SCORECARD.reduce(
    (acc, r) => {
      acc[r.score] += 1;
      return acc;
    },
    { green: 0, yellow: 0, red: 0 } as Record<ScorecardRow["score"], number>,
  );

  return (
    <div>
      <PageHeader
        title="Scorecard"
        description="Weekly marketing health check across 20 categories. Reds get fixed first."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Tally label="Green" value={counts.green} tone="bg-emerald-500" />
        <Tally label="Yellow" value={counts.yellow} tone="bg-amber-500" />
        <Tally label="Red" value={counts.red} tone="bg-rose-500" />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-t border-border">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Category</th>
              <th className="px-3 py-2 font-medium">Note</th>
              <th className="px-3 py-2 font-medium">Recommendation</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {SCORECARD.map((r) => (
              <tr
                key={r.category}
                className="border-b border-border/70 last:border-0"
              >
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${dotClass(r.score)}`}
                      aria-label={scoreLabel(r.score)}
                    />
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">
                      {scoreLabel(r.score)}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-3 font-medium text-foreground">
                  {r.category}
                </td>
                <td className="px-3 py-3 text-muted-foreground">{r.note}</td>
                <td className="px-3 py-3 text-foreground">{r.recommendation}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

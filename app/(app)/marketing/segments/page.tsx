import { PageHeader } from "@/components/layout/page-header";
import { SEGMENTS } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

export default function SegmentsPage() {
  return (
    <div>
      <PageHeader
        title="Guest Segments"
        description="Audiences we know how to reach. Each segment has a proven channel, offer, and campaign that works."
      />

      <div className="overflow-x-auto">
        <table className="min-w-full border-t border-border">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Segment</th>
              <th className="px-3 py-2 text-right font-medium">Size</th>
              <th className="px-3 py-2 font-medium">Best channel</th>
              <th className="px-3 py-2 font-medium">Best offer</th>
              <th className="px-3 py-2 font-medium">Best campaign</th>
              <th className="px-3 py-2 font-medium">Last contacted</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {SEGMENTS.map((s) => {
              const lapsedHighlight =
                s.name === "Lapsed guests" && s.size > 3000;
              return (
                <tr
                  key={s.name}
                  className="border-b border-border/70 last:border-0"
                >
                  <td className="px-3 py-3">
                    <span className="font-medium text-foreground">{s.name}</span>
                    {lapsedHighlight ? (
                      <span className="ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/15 text-amber-700">
                        Winback priority
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-foreground">
                    {s.size.toLocaleString()}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.bestChannel}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.bestOffer}
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {s.bestCampaign}
                  </td>
                  <td className="px-3 py-3 tabular-nums text-muted-foreground">
                    {s.lastContacted}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

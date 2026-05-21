import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { OFFERS, type MarketingOffer } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function approvalChip(o: MarketingOffer): { label: string; tone: string } {
  if (o.marginRisk) {
    return { label: "Margin risk", tone: "bg-rose-500/10 text-rose-700" };
  }
  if (o.approved) {
    return { label: "Approved", tone: "bg-emerald-500/15 text-emerald-700" };
  }
  return { label: "Pending", tone: "bg-muted text-muted-foreground" };
}

function OfferTable({ offers }: { offers: MarketingOffer[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-t border-border">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Offer</th>
            <th className="px-3 py-2 font-medium">Discount</th>
            <th className="px-3 py-2 font-medium">Rules</th>
            <th className="px-3 py-2 font-medium">Hours</th>
            <th className="px-3 py-2 font-medium">Location</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">Est. impact</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {offers.map((o) => {
            const chip = approvalChip(o);
            return (
              <tr key={o.name} className="border-b border-border/70 last:border-0">
                <td className="px-3 py-3 font-medium text-foreground">{o.name}</td>
                <td className="px-3 py-3 text-foreground">{o.discount}</td>
                <td className="px-3 py-3 text-muted-foreground">{o.rules}</td>
                <td className="px-3 py-3 text-muted-foreground">{o.validHours}</td>
                <td className="px-3 py-3 text-muted-foreground">{o.location}</td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${chip.tone}`}
                  >
                    {chip.label}
                  </span>
                </td>
                <td className="px-3 py-3 tabular-nums text-muted-foreground">
                  {o.estimatedImpact}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function OffersPage() {
  const grouped = OFFERS.reduce<Record<string, MarketingOffer[]>>((acc, o) => {
    (acc[o.category] ??= []).push(o);
    return acc;
  }, {});

  const categories = Object.keys(grouped).sort();

  return (
    <div>
      <PageHeader
        title="Offer Library"
        description="Approved promotions and their guardrails. Margin-risk offers need sign-off before launch."
      />

      <div className="space-y-6">
        {categories.map((cat) => (
          <Card key={cat}>
            <CardContent className="p-5">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-display text-base font-bold text-foreground">
                  {cat}
                </h2>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {grouped[cat].length}{" "}
                  {grouped[cat].length === 1 ? "offer" : "offers"}
                </span>
              </div>
              <OfferTable offers={grouped[cat]} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

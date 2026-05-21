import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdRequestDialog } from "@/components/marketing/ad-request-dialog";
import { META_ADS, type MetaAdRow } from "@/lib/data/marketing-sample";
import { listActiveCampaigns } from "@/lib/server/marketing";

export const dynamic = "force-dynamic";

type MetaStatus = MetaAdRow["status"];

function metaStatusTone(s: MetaStatus): string {
  switch (s) {
    case "scaling":
      return "bg-emerald-500/15 text-emerald-700";
    case "live":
      return "bg-primary/15 text-primary";
    case "paused":
      return "bg-amber-500/15 text-amber-700";
    case "killed":
      return "bg-rose-500/10 text-rose-700";
    case "testing":
      return "bg-accent/15 text-accent";
  }
}

function metaStatusLabel(s: MetaStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function roasTone(roas: number): string {
  if (roas >= 4) return "text-emerald-700";
  if (roas >= 2) return "text-amber-700";
  if (roas <= 0) return "text-muted-foreground";
  return "text-rose-600";
}

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function AdsTable({ rows }: { rows: MetaAdRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-12 text-center text-sm text-muted-foreground">
        No ads in this status.
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-t border-border">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="px-3 py-2 font-medium">Audience</th>
            <th className="px-3 py-2 text-right font-medium">Spend</th>
            <th className="px-3 py-2 text-right font-medium">CPL</th>
            <th className="px-3 py-2 text-right font-medium">ROAS</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {rows.map((ad) => (
            <tr
              key={ad.name}
              className="border-b border-border/70 last:border-0"
            >
              <td className="px-3 py-3">
                <div className="font-medium text-foreground">{ad.name}</div>
                <div className="text-xs text-muted-foreground">
                  {ad.objective}
                  {ad.notes ? ` · ${ad.notes}` : ""}
                </div>
              </td>
              <td className="px-3 py-3 text-muted-foreground">{ad.audience}</td>
              <td className="px-3 py-3 text-right tabular-nums text-foreground">
                {formatUsd(ad.spend)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-foreground">
                {ad.cpl > 0 ? `$${ad.cpl.toFixed(2)}` : "—"}
              </td>
              <td
                className={`px-3 py-3 text-right font-semibold tabular-nums ${roasTone(
                  ad.roas,
                )}`}
              >
                {ad.roas > 0 ? `${ad.roas.toFixed(1)}x` : "—"}
              </td>
              <td className="px-3 py-3">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${metaStatusTone(
                    ad.status,
                  )}`}
                >
                  {metaStatusLabel(ad.status)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdsPage() {
  const filter = (s: MetaStatus) => META_ADS.filter((a) => a.status === s);
  const campaigns = await listActiveCampaigns();

  return (
    <div>
      <PageHeader
        title="Meta Ads"
        description="Live spend, lead cost, and ROAS across every active set. Kill the losers, scale the winners."
        action={<AdRequestDialog campaigns={campaigns} />}
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({META_ADS.length})</TabsTrigger>
          <TabsTrigger value="scaling">
            Scaling ({filter("scaling").length})
          </TabsTrigger>
          <TabsTrigger value="live">Live ({filter("live").length})</TabsTrigger>
          <TabsTrigger value="killed">
            Killed ({filter("killed").length})
          </TabsTrigger>
          <TabsTrigger value="testing">
            Testing ({filter("testing").length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <AdsTable rows={META_ADS} />
        </TabsContent>
        <TabsContent value="scaling">
          <AdsTable rows={filter("scaling")} />
        </TabsContent>
        <TabsContent value="live">
          <AdsTable rows={filter("live")} />
        </TabsContent>
        <TabsContent value="killed">
          <AdsTable rows={filter("killed")} />
        </TabsContent>
        <TabsContent value="testing">
          <AdsTable rows={filter("testing")} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

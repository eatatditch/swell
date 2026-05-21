import { Megaphone } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/data/empty-state";
import { AdRequestDialog } from "@/components/marketing/ad-request-dialog";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { listActiveCampaigns } from "@/lib/server/marketing";
import {
  AD_CHANNEL_LABELS,
  AD_REQUEST_STATUSES,
  AD_REQUEST_STATUS_LABELS,
  adStatusTone,
  formatMoney,
} from "@/lib/constants/marketing";
import type { AdRequest, AdRequestStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

async function listAdRequests(): Promise<AdRequest[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("ad_requests")
    .select("*")
    .order("created_at", { ascending: false });
  return (data ?? []) as AdRequest[];
}

function AdsTable({ rows }: { rows: AdRequest[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <EmptyState
            icon={Megaphone}
            title="No ads in this status"
            description="Request an ad with the button up top."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="overflow-x-auto p-0">
        <table className="min-w-full">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-2 font-medium">Title</th>
              <th className="px-4 py-2 font-medium">Channel</th>
              <th className="px-4 py-2 font-medium">Dates</th>
              <th className="px-4 py-2 text-right font-medium">Budget</th>
              <th className="px-4 py-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {rows.map((ad) => (
              <tr
                key={ad.id}
                className="border-t border-border align-middle"
              >
                <td className="px-4 py-3">
                  <div className="font-medium">{ad.title}</div>
                  {ad.goal ? (
                    <div className="text-xs text-muted-foreground">
                      {ad.goal}
                    </div>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {AD_CHANNEL_LABELS[ad.channel]}
                </td>
                <td className="px-4 py-3 text-xs tabular-nums text-muted-foreground">
                  {ad.starts_on || ad.ends_on
                    ? `${ad.starts_on ?? "—"} → ${ad.ends_on ?? "—"}`
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {formatMoney(ad.budget_cents)}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                      adStatusTone(ad.status),
                    )}
                  >
                    {AD_REQUEST_STATUS_LABELS[ad.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default async function AdsPage() {
  const [ads, campaigns] = await Promise.all([
    listAdRequests(),
    listActiveCampaigns(),
  ]);

  const filter = (s: AdRequestStatus) => ads.filter((a) => a.status === s);
  const totalBudget = ads.reduce((n, a) => n + (a.budget_cents ?? 0), 0);
  const liveBudget = ads
    .filter((a) => a.status === "live")
    .reduce((n, a) => n + (a.budget_cents ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Meta Ads"
        description="Paid ad requests. Spend / ROAS / leads will land here once Meta is wired."
        action={<AdRequestDialog campaigns={campaigns} />}
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Total requested
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {ads.length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Live budget
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(liveBudget)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              All-time budget
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">
              {formatMoney(totalBudget)}
            </p>
          </CardContent>
        </Card>
      </section>

      <Tabs defaultValue="all">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="all">All ({ads.length})</TabsTrigger>
          {AD_REQUEST_STATUSES.map((s) => (
            <TabsTrigger key={s} value={s}>
              {AD_REQUEST_STATUS_LABELS[s]} ({filter(s).length})
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="all">
          <AdsTable rows={ads} />
        </TabsContent>
        {AD_REQUEST_STATUSES.map((s) => (
          <TabsContent key={s} value={s}>
            <AdsTable rows={filter(s)} />
          </TabsContent>
        ))}
      </Tabs>
    </>
  );
}

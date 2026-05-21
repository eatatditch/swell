import Link from "next/link";
import { Megaphone, Plus } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { CampaignBuilderDialog } from "@/components/marketing/campaign-builder-dialog";
import { listCampaigns, listLocations } from "@/lib/server/marketing";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  campaignStatusTone,
  formatMoney,
} from "@/lib/constants/marketing";
import type { CampaignStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignsListPage() {
  const [campaigns, locations] = await Promise.all([
    listCampaigns(),
    listLocations(),
  ]);

  const byStatus = new Map<CampaignStatus, typeof campaigns>();
  for (const c of campaigns) {
    const arr = byStatus.get(c.status) ?? [];
    arr.push(c);
    byStatus.set(c.status, arr);
  }

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Pick a campaign type, hit the inputs, ship it."
        action={<CampaignBuilderDialog locations={locations} />}
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-5">
        {CAMPAIGN_STATUSES.map((s) => (
          <Card key={s}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {CAMPAIGN_STATUS_LABELS[s]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-2xl font-semibold tabular-nums">
                {byStatus.get(s)?.length ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Megaphone}
              title="No campaigns yet"
              description="Build your first campaign and SWELL will start tracking content, ads, emails, and outcomes against it."
              action={
                <CampaignBuilderDialog
                  locations={locations}
                  triggerLabel="Build campaign"
                />
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {campaigns.map((c) => (
            <Link
              key={c.id}
              href={`/marketing/campaigns/${c.id}`}
              className="group rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-base font-bold leading-snug group-hover:underline">
                    {c.name}
                  </p>
                  {c.theme ? (
                    <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
                      {c.theme}
                    </p>
                  ) : null}
                  {c.goal ? (
                    <p className="mt-2 line-clamp-2 text-sm">{c.goal}</p>
                  ) : null}
                </div>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                    campaignStatusTone(c.status),
                  )}
                >
                  {CAMPAIGN_STATUS_LABELS[c.status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {c.starts_on ? <span>Starts {c.starts_on}</span> : null}
                {c.ends_on ? <span>Ends {c.ends_on}</span> : null}
                {c.location_name ? <span>· {c.location_name}</span> : null}
                {c.owner_name ? <span>· {c.owner_name}</span> : null}
                {c.budget_cents != null ? (
                  <span>· {formatMoney(c.budget_cents)}</span>
                ) : null}
                <span>
                  · {c.content_count} content · {c.ad_count} ads
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

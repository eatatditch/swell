import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  ClipboardList,
  DollarSign,
  ListChecks,
  Megaphone,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { getCampaign } from "@/lib/server/marketing";
import {
  AD_CHANNEL_LABELS,
  AD_REQUEST_STATUS_LABELS,
  CAMPAIGN_STATUS_LABELS,
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUS_LABELS,
  CREATIVE_BRIEF_STATUS_LABELS,
  adStatusTone,
  campaignStatusTone,
  contentStatusTone,
  formatMoney,
} from "@/lib/constants/marketing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const campaign = await getCampaign(params.id);
  if (!campaign) notFound();

  return (
    <>
      <PageHeader
        title={campaign.name}
        description={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {campaign.theme ? (
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                {campaign.theme}
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 font-medium",
                campaignStatusTone(campaign.status),
              )}
            >
              {CAMPAIGN_STATUS_LABELS[campaign.status]}
            </span>
            {campaign.location_name ? (
              <span className="text-muted-foreground">
                · {campaign.location_name}
              </span>
            ) : null}
            {campaign.owner_name ? (
              <span className="text-muted-foreground">
                · Owner {campaign.owner_name}
              </span>
            ) : null}
          </div>
        }
        action={
          <Link
            href="/marketing/campaigns"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> All campaigns
          </Link>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-4">
        <Stat
          icon={CalendarDays}
          label="Dates"
          value={
            campaign.starts_on || campaign.ends_on
              ? `${campaign.starts_on ?? "—"} → ${campaign.ends_on ?? "—"}`
              : "Open-ended"
          }
        />
        <Stat
          icon={DollarSign}
          label="Budget"
          value={formatMoney(campaign.budget_cents ?? null)}
        />
        <Stat
          icon={ListChecks}
          label="Content items"
          value={String(campaign.content_items.length)}
        />
        <Stat
          icon={Megaphone}
          label="Ads"
          value={String(campaign.ad_requests.length)}
        />
      </section>

      {campaign.description ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Overview</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>{campaign.description}</p>
            {campaign.goal ? (
              <p className="mt-3 text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Goal: </span>
                {campaign.goal}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="briefs">Briefs</TabsTrigger>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="shots">Shot lists</TabsTrigger>
          <TabsTrigger value="ugc">UGC</TabsTrigger>
          <TabsTrigger value="perf">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="content">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Content items</CardTitle>
              <CardDescription>
                Everything we&apos;re publishing under this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.content_items.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="No content yet"
                  description="Add items from the Content Engine."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {campaign.content_items.map((it) => (
                    <li
                      key={it.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium">{it.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {CONTENT_CHANNEL_LABELS[it.channel]}
                          {it.scheduled_for
                            ? ` · ${it.scheduled_for.slice(0, 16).replace("T", " ")}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          contentStatusTone(it.status),
                        )}
                      >
                        {CONTENT_STATUS_LABELS[it.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="briefs">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Creative briefs</CardTitle>
              <CardDescription>What we&apos;re asking creative for.</CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.briefs.length === 0 ? (
                <EmptyState
                  icon={ClipboardList}
                  title="No briefs yet"
                  description="Add a brief so creative knows the audience, mandatories, and deliverables."
                />
              ) : (
                <ul className="space-y-3 text-sm">
                  {campaign.briefs.map((b) => (
                    <li key={b.id} className="rounded-lg border bg-card p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="font-semibold">{b.title}</p>
                        <span className="text-xs text-muted-foreground">
                          {CREATIVE_BRIEF_STATUS_LABELS[b.status]}
                        </span>
                      </div>
                      {b.audience ? (
                        <p className="mt-1 text-xs">
                          <span className="font-semibold">Audience: </span>
                          {b.audience}
                        </p>
                      ) : null}
                      {b.key_messages ? (
                        <p className="text-xs">
                          <span className="font-semibold">Key messages: </span>
                          {b.key_messages}
                        </p>
                      ) : null}
                      {b.deliverables ? (
                        <p className="text-xs">
                          <span className="font-semibold">Deliverables: </span>
                          {b.deliverables}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ads">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ad requests</CardTitle>
              <CardDescription>
                Paid ads in flight or queued for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.ad_requests.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No ads yet"
                  description="Request ad creative or copy from this view."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {campaign.ad_requests.map((a) => (
                    <li
                      key={a.id}
                      className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3"
                    >
                      <div>
                        <p className="font-medium">{a.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {AD_CHANNEL_LABELS[a.channel]}
                          {a.budget_cents != null
                            ? ` · ${formatMoney(a.budget_cents)}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          adStatusTone(a.status),
                        )}
                      >
                        {AD_REQUEST_STATUS_LABELS[a.status]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="shots">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shot lists</CardTitle>
              <CardDescription>
                Every shoot tied to this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.shot_lists.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No shot lists yet"
                  description="Plan a shoot from /marketing/shot-lists."
                />
              ) : (
                <ul className="space-y-3 text-sm">
                  {campaign.shot_lists.map((s) => (
                    <li key={s.id} className="rounded-lg border bg-card p-3">
                      <p className="font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.shoot_date ? `Shoots ${s.shoot_date}` : "Date TBD"}
                        {s.photographer ? ` · ${s.photographer}` : ""}
                      </p>
                      {s.items.length > 0 ? (
                        <ul className="mt-2 list-disc pl-4 text-xs">
                          {s.items.map((i) => (
                            <li key={i.id}>{i.description}</li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ugc">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">UGC collaborations</CardTitle>
              <CardDescription>
                Influencer / creator deliverables for this campaign.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.ugc_collaborations.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No collaborations yet"
                  description="Tie a creator's deliverable to this campaign from the UGC CRM."
                />
              ) : (
                <ul className="space-y-2 text-sm">
                  {campaign.ugc_collaborations.map((u) => (
                    <li key={u.id} className="rounded-lg border bg-card p-3">
                      <p className="font-medium">{u.deliverable}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.status}
                        {u.due_on ? ` · due ${u.due_on}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="perf">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance notes</CardTitle>
              <CardDescription>
                What we learned, what we&apos;d do differently.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {campaign.performance_notes.length === 0 ? (
                <EmptyState
                  icon={ListChecks}
                  title="No notes yet"
                  description="Drop post-campaign metrics + observations here when the campaign wraps."
                />
              ) : (
                <ul className="space-y-3 text-sm">
                  {campaign.performance_notes.map((p) => (
                    <li key={p.id} className="rounded-lg border bg-card p-3">
                      {p.metric ? (
                        <p className="font-semibold">{p.metric}</p>
                      ) : null}
                      {p.result ? (
                        <p className="text-xs">
                          <span className="font-semibold">Result: </span>
                          {p.result}
                        </p>
                      ) : null}
                      {p.observation ? (
                        <p className="text-xs">{p.observation}</p>
                      ) : null}
                      {p.next_time ? (
                        <p className="mt-1 text-xs text-accent">
                          Next time: {p.next_time}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-base font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}

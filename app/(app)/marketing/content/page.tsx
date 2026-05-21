import { Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ContentItemDialog } from "@/components/marketing/content-item-dialog";
import {
  CONTENT_CARDS,
  CONTENT_COLUMNS,
  CONTENT_COLUMN_LABELS,
  type ContentColumn,
} from "@/lib/data/marketing-sample";
import { listActiveCampaigns } from "@/lib/server/marketing";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ContentEnginePage() {
  const campaigns = await listActiveCampaigns();
  const byColumn = new Map<ContentColumn, typeof CONTENT_CARDS>();
  for (const c of CONTENT_CARDS) {
    const arr = byColumn.get(c.column) ?? [];
    arr.push(c);
    byColumn.set(c.column, arr);
  }

  return (
    <>
      <PageHeader
        title="Content engine"
        description="Production board for every Reel, TikTok, story, email, and ad on the way out the door."
        action={<ContentItemDialog campaigns={campaigns} />}
      />

      <section className="mb-6 flex flex-wrap gap-2">
        {[
          "Reels",
          "TikTok",
          "Carousels",
          "Stories",
          "Polls",
          "Behind-the-scenes",
          "Founder voice",
          "Staff spotlight",
          "Local guides",
          "Funny skits",
        ].map((c) => (
          <span
            key={c}
            className="inline-flex items-center rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
          >
            {c}
          </span>
        ))}
      </section>

      <div className="overflow-x-auto pb-3">
        <div className="grid min-w-[1200px] auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3">
          {CONTENT_COLUMNS.map((col) => {
            const cards = byColumn.get(col) ?? [];
            return (
              <div key={col} className="flex flex-col rounded-2xl bg-muted/40 p-3">
                <div className="mb-2 flex items-baseline justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {CONTENT_COLUMN_LABELS[col]}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {cards.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {cards.length === 0 ? (
                    <p className="rounded-md border border-dashed bg-card/40 p-3 text-xs text-muted-foreground">
                      Nothing here.
                    </p>
                  ) : (
                    cards.map((c) => (
                      <ContentCardView key={c.id} card={c} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" /> Reusable shot list
            templates
          </CardTitle>
          <CardDescription>
            Tap into when planning a shoot. Plug into any content card.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ShotTemplateGrid />
        </CardContent>
      </Card>
    </>
  );
}

function ContentCardView({
  card,
}: {
  card: (typeof CONTENT_CARDS)[number];
}) {
  return (
    <div className="rounded-md border bg-card p-3 text-xs shadow-sm">
      <p className="text-sm font-semibold leading-snug">{card.title}</p>
      <p className="mt-1 text-muted-foreground">{card.platform}</p>
      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        <p>Campaign: {card.campaign}</p>
        <p>Location: {card.location}</p>
        <p>Talent: {card.talentNeeded}</p>
        <p>Deadline: {card.deadline}</p>
        {card.caption ? (
          <p className="mt-1 line-clamp-2 italic text-foreground/80">
            “{card.caption}”
          </p>
        ) : null}
      </div>
    </div>
  );
}

import { SHOT_LIST_TEMPLATES } from "@/lib/data/marketing-sample";

function ShotTemplateGrid() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {SHOT_LIST_TEMPLATES.map((s) => (
        <div
          key={s}
          className={cn(
            "rounded-lg border bg-background p-3 text-xs font-medium hover:bg-muted",
          )}
        >
          {s}
        </div>
      ))}
    </div>
  );
}

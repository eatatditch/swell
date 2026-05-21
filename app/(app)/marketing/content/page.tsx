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
import { ContentBoard } from "@/components/marketing/content-board";
import {
  listActiveCampaigns,
  listContentItems,
} from "@/lib/server/marketing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SHOT_LIST_TEMPLATES } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

export default async function ContentEnginePage() {
  const supabase = createSupabaseServerClient();
  const [items, campaigns, campaignNameRows] = await Promise.all([
    listContentItems(),
    listActiveCampaigns(),
    supabase.from("marketing_campaigns").select("id, name"),
  ]);

  const campaignNamesById: Record<string, string> = {};
  for (const r of (campaignNameRows.data ?? []) as { id: string; name: string }[]) {
    campaignNamesById[r.id] = r.name;
  }

  return (
    <>
      <PageHeader
        title="Content engine"
        description="Drag cards between columns. Each move updates status in SWELL."
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

      <ContentBoard items={items} campaignNamesById={campaignNamesById} />

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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {SHOT_LIST_TEMPLATES.map((s) => (
              <div
                key={s}
                className="rounded-lg border bg-background p-3 text-xs font-medium hover:bg-muted"
              >
                {s}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

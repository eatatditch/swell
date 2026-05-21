import { Camera, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SHOT_LIST_TEMPLATES } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

export default function ShotListsPage() {
  return (
    <div>
      <PageHeader
        title="Shot Lists"
        description="Templates the shoot team can grab to plan a session — and a starting point for new lists."
        action={
          <Button>
            <Plus className="mr-1.5 h-4 w-4" />
            Create shot list
          </Button>
        }
      />

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Camera className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-base font-bold text-foreground">
              Templates
            </h2>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              · {SHOT_LIST_TEMPLATES.length}
            </span>
          </div>

          <p className="mb-4 text-sm text-muted-foreground">
            Pre-built shot sequences for common Ditch content. Tap a chip to
            start a new list from that template.
          </p>

          <div className="flex flex-wrap gap-2">
            {SHOT_LIST_TEMPLATES.map((t) => (
              <span
                key={t}
                className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted"
              >
                {t}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="mt-6">
        <Card className="border-dashed bg-card/60">
          <CardContent className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-bold text-foreground">
              Build your own shot list
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              Start blank or remix a template. Add shots, talent, and props,
              then send it to the shoot team.
            </p>
            <Button variant="outline">Create shot list</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

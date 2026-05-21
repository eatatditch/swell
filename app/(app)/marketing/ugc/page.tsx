import { Users } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CREATORS } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function rehireTone(score: number): string {
  if (score >= 80) return "text-emerald-700";
  if (score >= 60) return "text-amber-700";
  return "text-rose-600";
}

export default function UgcPage() {
  return (
    <div>
      <PageHeader
        title="UGC / Creators"
        description="Roster of local creators, what we've paid, and whether they're worth a second collab."
      />

      <Tabs defaultValue="creators">
        <TabsList>
          <TabsTrigger value="creators">
            Creators ({CREATORS.length})
          </TabsTrigger>
          <TabsTrigger value="collabs">Collaborations</TabsTrigger>
        </TabsList>

        <TabsContent value="creators">
          <div className="overflow-x-auto">
            <table className="min-w-full border-t border-border">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Creator</th>
                  <th className="px-3 py-2 font-medium">Handle</th>
                  <th className="px-3 py-2 font-medium">Location</th>
                  <th className="px-3 py-2 text-right font-medium">Audience</th>
                  <th className="px-3 py-2 text-right font-medium">Eng.</th>
                  <th className="px-3 py-2 font-medium">Style</th>
                  <th className="px-3 py-2 text-right font-medium">Rehire</th>
                  <th className="px-3 py-2 font-medium">Flag</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {CREATORS.map((c) => (
                  <tr
                    key={c.handle}
                    className="border-b border-border/70 last:border-0"
                  >
                    <td className="px-3 py-3">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.costNote} · {c.priorCollabs} prior
                      </div>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {c.handle}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {c.location}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {c.audience.toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {c.engagement.toFixed(1)}%
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {c.style}
                    </td>
                    <td
                      className={`px-3 py-3 text-right font-semibold tabular-nums ${rehireTone(
                        c.rehireScore,
                      )}`}
                    >
                      {c.rehireScore}
                    </td>
                    <td className="px-3 py-3">
                      {c.doNotUse ? (
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-rose-500/10 text-rose-700">
                          Do not use
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="collabs">
          <EmptyState
            icon={Users}
            title="No collaborations yet"
            description="Once a creator is briefed and live, the collab will show up here with status, deliverables, and payment."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

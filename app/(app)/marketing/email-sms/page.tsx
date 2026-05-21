import { AlertTriangle, Mail, MessageSquare } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/data/empty-state";
import { ContentItemDialog } from "@/components/marketing/content-item-dialog";
import { SendNowDialog } from "@/components/marketing/send-now-dialog";
import { listActiveCampaigns, listContentItems } from "@/lib/server/marketing";
import { listAllTags } from "@/lib/server/marketing-subscribers";
import {
  CONTENT_STATUS_LABELS,
  contentStatusTone,
} from "@/lib/constants/marketing";
import type { ContentItem } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isoWeek(d: Date): string {
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(
    ((d.getTime() - onejan.getTime()) / 86_400_000 + onejan.getDay() + 1) / 7,
  );
  return `${d.getFullYear()}-W${week}`;
}

function overloadedSmsWeeks(rows: ContentItem[]): string[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    if (!r.scheduled_for) continue;
    const d = new Date(r.scheduled_for);
    if (Number.isNaN(d.getTime())) continue;
    const k = isoWeek(d);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, c]) => c > 2).map(([k]) => k);
}

export default async function EmailSmsPage() {
  const [items, campaigns, knownTags] = await Promise.all([
    listContentItems(),
    listActiveCampaigns(),
    listAllTags(),
  ]);
  const emails = items.filter((i) => i.channel === "email");
  const smses = items.filter((i) => i.channel === "sms");
  const overloaded = overloadedSmsWeeks(
    smses.filter((s) => s.status === "scheduled" || s.status === "approved"),
  );

  return (
    <>
      <PageHeader
        title="Email & SMS"
        description="Outbound campaigns to Surf Club, segments, and lapsed guests. SMS frequency is rate-limited per guest."
        action={
          <div className="flex gap-2">
            <ContentItemDialog
              campaigns={campaigns}
              defaultChannel="email"
              channelFilter={["email"]}
              knownTags={knownTags}
              triggerLabel="New email"
            />
            <ContentItemDialog
              campaigns={campaigns}
              defaultChannel="sms"
              channelFilter={["sms"]}
              knownTags={knownTags}
              triggerLabel="New SMS"
            />
          </div>
        }
      />

      {overloaded.length > 0 ? (
        <Card className="mb-6 border-amber-500/40 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div className="text-sm">
              <div className="font-semibold text-amber-700">
                SMS frequency guardrail
              </div>
              <div className="mt-0.5 text-amber-700/90">
                More than 2 SMS scheduled in the same week
                {overloaded.length > 1 ? "s" : ""} ({overloaded.join(", ")}).
                Risk of opt-outs — consider spacing them out.
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email ({emails.length})
          </TabsTrigger>
          <TabsTrigger value="sms" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" /> SMS ({smses.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="email">
          {emails.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={Mail}
                  title="No emails yet"
                  description="Draft your first send with the New email button."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Subject</th>
                      <th className="px-4 py-2 font-medium">Tags</th>
                      <th className="px-4 py-2 font-medium">Send</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {emails.map((e) => (
                      <tr
                        key={e.id}
                        className="border-t border-border align-middle"
                      >
                        <td className="px-4 py-2">
                          <p className="font-medium">{e.subject ?? e.title}</p>
                          {e.preheader ? (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {e.preheader}
                            </p>
                          ) : null}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {e.target_tags.length > 0
                            ? e.target_tags.join(", ")
                            : "everyone"}
                        </td>
                        <td className="px-4 py-2 text-xs tabular-nums">
                          {e.scheduled_for
                            ? e.scheduled_for.slice(0, 16).replace("T", " ")
                            : "—"}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              contentStatusTone(e.status),
                            )}
                          >
                            {CONTENT_STATUS_LABELS[e.status]}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right">
                          {e.status !== "posted" ? (
                            <SendNowDialog
                              contentItemId={e.id}
                              channel="email"
                              title={e.subject ?? e.title}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              Sent
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="sms">
          {smses.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={MessageSquare}
                  title="No SMS yet"
                  description="Add a text with the New SMS button — keep it under 160 chars."
                />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="overflow-x-auto p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-2 font-medium">Message</th>
                      <th className="px-4 py-2 font-medium">Chars</th>
                      <th className="px-4 py-2 font-medium">Tags</th>
                      <th className="px-4 py-2 font-medium">Status</th>
                      <th className="px-4 py-2 font-medium" />
                    </tr>
                  </thead>
                  <tbody>
                    {smses.map((s) => {
                      const body = s.body ?? s.caption ?? "";
                      return (
                        <tr
                          key={s.id}
                          className="border-t border-border align-middle"
                        >
                          <td className="px-4 py-2">
                            <p className="font-medium">{s.title}</p>
                            {body ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">
                                {body}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-xs tabular-nums">
                            {body.length}
                            {body.length > 160 ? (
                              <span className="ml-1 text-amber-700">
                                · {Math.ceil(body.length / 160)} segs
                              </span>
                            ) : null}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {s.target_tags.length > 0
                              ? s.target_tags.join(", ")
                              : "everyone"}
                          </td>
                          <td className="px-4 py-2">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                contentStatusTone(s.status),
                              )}
                            >
                              {CONTENT_STATUS_LABELS[s.status]}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-right">
                            {s.status !== "posted" ? (
                              <SendNowDialog
                                contentItemId={s.id}
                                channel="sms"
                                title={s.title}
                              />
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Sent
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

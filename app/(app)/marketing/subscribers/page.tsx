import { Mail, MessageSquare, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { SubscribersTable } from "@/components/marketing/subscribers-table";
import { CreateSubscriberDialog } from "@/components/marketing/create-subscriber-dialog";
import { ImportSubscribersDialog } from "@/components/marketing/import-subscribers-dialog";
import {
  getSubscriberCounts,
  listAllTags,
  listSubscribers,
} from "@/lib/server/marketing-subscribers";

export const dynamic = "force-dynamic";

export default async function SubscribersPage() {
  const [subs, counts, tags] = await Promise.all([
    listSubscribers(),
    getSubscriberCounts(),
    listAllTags(),
  ]);

  return (
    <>
      <PageHeader
        title="Subscribers"
        description="Surf Club, Surf Club, lapsed guests, leads — the people you actually send to."
        action={
          <div className="flex gap-2">
            <ImportSubscribersDialog knownTags={tags} />
            <CreateSubscriberDialog knownTags={tags} />
          </div>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <Stat icon={Users} label="Active" value={counts.total} />
        <Stat
          icon={Mail}
          label="Emailable"
          value={counts.emailable}
        />
        <Stat
          icon={MessageSquare}
          label="Textable"
          value={counts.textable}
        />
      </section>

      {counts.byTag.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Tags</CardTitle>
            <CardDescription>
              Use these to target sends. Pull a tag in the new-content dialog.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {counts.byTag.map((t) => (
                <span
                  key={t.tag}
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent"
                >
                  {t.tag}
                  <span className="text-accent/70">· {t.count}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {subs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={Users}
              title="No subscribers yet"
              description="Add one by hand or import a CSV (headers: name, email, phone, tags)."
            />
          </CardContent>
        </Card>
      ) : (
        <SubscribersTable subscribers={subs} knownTags={tags} />
      )}
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-3xl font-semibold tabular-nums">
          {value.toLocaleString()}
        </p>
      </CardContent>
    </Card>
  );
}

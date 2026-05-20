import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { CHECKLIST_KIND_LABELS } from "@/lib/constants/daily-ops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { getTodayChecklistsForLocation } from "@/lib/server/daily-ops";
import { cn } from "@/lib/utils";
import type { Checklist } from "@/lib/types/database";

export default async function DailyOpsChecklistsPage() {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  const supabase = createSupabaseServerClient();
  const { data: templates } = await supabase
    .from("checklists")
    .select("*")
    .order("is_active", { ascending: false })
    .order("kind")
    .order("name");

  const canAuthor =
    profile.role === "founder_admin" || profile.role === "general_manager";

  return (
    <>
      <PageHeader
        title="Checklists"
        description="Templates and today's runs."
        action={
          canAuthor ? (
            <Button asChild variant="accent" size="sm" className="gap-1.5">
              <Link href="/daily-ops/checklists/new">
                <Plus className="h-4 w-4" />
                New template
              </Link>
            </Button>
          ) : null
        }
      />

      {active ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">
              Today at {active.name}
            </CardTitle>
            <CardDescription>
              Click a checklist to run it. Mobile-friendly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TodayChecklists locationId={active.id} />
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s runs</CardTitle>
          </CardHeader>
          <CardContent>
            <LocationGate multiLocation={locations.length > 1} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All templates</CardTitle>
          <CardDescription>
            Edit a template to change line items. Company-wide templates apply
            to every location.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TemplateList
            templates={(templates ?? []) as Checklist[]}
            canEdit={canAuthor}
          />
        </CardContent>
      </Card>
    </>
  );
}

async function TodayChecklists({ locationId }: { locationId: string }) {
  const rows = await getTodayChecklistsForLocation(locationId);
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No templates yet"
        description="Templates seeded by an admin show up here."
      />
    );
  }
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {rows.map((r) => {
        const done = r.completion?.status === "completed";
        const inProgress = r.completion?.status === "in_progress";
        return (
          <li key={r.checklist.id}>
            <Link
              href={`/daily-ops/checklists/${r.checklist.id}`}
              className={cn(
                "block rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md",
                done && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">{r.checklist.name}</p>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
                  {CHECKLIST_KIND_LABELS[r.checklist.kind]}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {done
                  ? "Completed"
                  : inProgress
                    ? "In progress"
                    : "Not started"}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function TemplateList({
  templates,
  canEdit,
}: {
  templates: Checklist[];
  canEdit: boolean;
}) {
  if (templates.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No templates"
        description="Build your first one."
      />
    );
  }
  return (
    <ul className="space-y-2">
      {templates.map((t) => (
        <li key={t.id}>
          <Link
            href={
              canEdit
                ? `/daily-ops/checklists/${t.id}/edit`
                : `/daily-ops/checklists/${t.id}`
            }
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 transition-shadow hover:shadow-md"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{t.name}</p>
              <p className="text-xs text-muted-foreground">
                {CHECKLIST_KIND_LABELS[t.kind]}
                {t.location_id ? " · location-scoped" : " · company-wide"}
                {!t.is_active ? " · inactive" : null}
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              {canEdit ? "Edit" : "Open"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Pencil } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ChecklistRunner } from "@/components/checklists/checklist-runner";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { StartRunButton } from "@/components/checklists/start-run-button";
import { CHECKLIST_KIND_LABELS, todayISO } from "@/lib/constants/daily-ops";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getChecklistRun } from "@/lib/server/daily-ops";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import type { Checklist, ChecklistItem } from "@/lib/types/database";

interface PageProps {
  params: { id: string };
}

export default async function ChecklistRunPage({ params }: PageProps) {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  const supabase = createSupabaseServerClient();
  const { data: template } = await supabase
    .from("checklists")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!template) notFound();
  const t = template as Checklist;

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", t.id)
    .order("position");
  const allItems = (items ?? []) as ChecklistItem[];

  const canAuthor =
    profile.role === "founder_admin" || profile.role === "general_manager";

  const today = todayISO();
  const run = active ? await getChecklistRun(t.id, active.id, today) : null;

  return (
    <>
      <PageHeader
        title={t.name}
        description={`${CHECKLIST_KIND_LABELS[t.kind]} · ${
          t.location_id ? "Location-scoped" : "Company-wide"
        }`}
        action={
          canAuthor ? (
            <Button asChild size="sm" variant="outline" className="gap-1.5">
              <Link href={`/daily-ops/checklists/${t.id}/edit`}>
                <Pencil className="h-4 w-4" />
                Edit template
              </Link>
            </Button>
          ) : null
        }
      />

      {t.description ? (
        <p className="mb-4 text-sm text-muted-foreground">{t.description}</p>
      ) : null}

      {!active ? (
        <LocationGate multiLocation={locations.length > 1} />
      ) : run ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Run for {today}
            </CardTitle>
            <CardDescription>
              {run.completion.status === "completed"
                ? "Completed. Reopen if something changed."
                : "Tap each item as you finish it."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChecklistRunner
              checklist={run.checklist}
              items={run.items}
              completion={run.completion}
              initialItemCompletions={run.itemCompletions}
              initialManagerLog={run.managerLog}
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Start today&apos;s run</CardTitle>
            <CardDescription>
              {allItems.length === 0
                ? "This template has no items yet."
                : `${allItems.length} items to complete.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Ask a manager to add items before running this checklist.
              </p>
            ) : (
              <StartRunButton
                checklistId={t.id}
                locationId={active.id}
                runDate={today}
              />
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

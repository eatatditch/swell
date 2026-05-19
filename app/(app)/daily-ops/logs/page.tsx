import { NotebookPen } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/data/empty-state";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { ManagerLogComposer } from "@/components/daily-ops/logs/manager-log-composer";
import { ManagerLogList } from "@/components/daily-ops/logs/manager-log-list";
import { ShiftHandoffPanel } from "@/components/daily-ops/logs/shift-handoff-panel";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import type { ManagerLog, ProfileLite, ShiftNote } from "@/lib/types/database";

export default async function DailyOpsLogsPage() {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  if (!active) {
    return (
      <>
        <PageHeader
          title="Manager Logs"
          description="Narrative shift logs and handoffs."
        />
        <LocationGate multiLocation={locations.length > 1} />
      </>
    );
  }

  const supabase = createSupabaseServerClient();
  const [logsRes, notesRes] = await Promise.all([
    supabase
      .from("manager_logs")
      .select(
        "*, author:profiles!manager_logs_author_id_fkey(id, full_name, email, avatar_url)",
      )
      .eq("location_id", active.id)
      .order("log_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("shift_notes")
      .select(
        "*, author:profiles!shift_notes_author_id_fkey(id, full_name, email, avatar_url)",
      )
      .eq("location_id", active.id)
      .order("note_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (logsRes.error) console.error("manager_logs select:", logsRes.error);
  if (notesRes.error) console.error("shift_notes select:", notesRes.error);

  const logs = (logsRes.data ?? []) as (ManagerLog & {
    author: ProfileLite | null;
  })[];
  const notes = (notesRes.data ?? []) as (ShiftNote & {
    author: ProfileLite | null;
  })[];

  const completionIds = logs
    .map((l) => l.checklist_completion_id)
    .filter((id): id is string => !!id);
  let runLinks: Record<string, string> = {};
  if (completionIds.length > 0) {
    const { data: completions } = await supabase
      .from("checklist_completions")
      .select("id, checklist_id")
      .in("id", completionIds);
    runLinks = Object.fromEntries(
      (completions ?? []).map((c) => [
        c.id as string,
        `/daily-ops/checklists/${c.checklist_id as string}`,
      ]),
    );
  }

  return (
    <>
      <PageHeader
        title="Manager Logs"
        description={`Shift narrative and handoff for ${active.name}.`}
      />

      <Tabs defaultValue="logs" className="space-y-4">
        <TabsList>
          <TabsTrigger value="logs">Manager log</TabsTrigger>
          <TabsTrigger value="handoff">Shift handoff</TabsTrigger>
        </TabsList>
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">New entry</CardTitle>
              <CardDescription>
                What happened on shift. Use bullets if you like.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ManagerLogComposer locationId={active.id} />
            </CardContent>
          </Card>

          {logs.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="No logs yet"
              description="Post the first entry above."
            />
          ) : (
            <ManagerLogList
              logs={logs}
              currentUserId={profile.id}
              currentUserRole={profile.role}
              runLinks={runLinks}
            />
          )}
        </TabsContent>
        <TabsContent value="handoff">
          <ShiftHandoffPanel
            locationId={active.id}
            currentUserId={profile.id}
            notes={notes}
          />
        </TabsContent>
      </Tabs>
    </>
  );
}

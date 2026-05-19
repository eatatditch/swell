import { ShieldAlert } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { CompVoidForm } from "@/components/daily-ops/comp-void/comp-void-form";
import { CompVoidList } from "@/components/daily-ops/comp-void/comp-void-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import type { CompVoidNote, ProfileLite, Role } from "@/lib/types/database";

const MANAGER_ROLES: Role[] = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
];

export default async function CompVoidPage() {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const isManager = MANAGER_ROLES.includes(profile.role);

  if (!active) {
    return (
      <>
        <PageHeader
          title="Comp / Void Log"
          description="Manager-only record of comps and voids."
        />
        <LocationGate multiLocation={locations.length > 1} />
      </>
    );
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("comp_void_notes")
    .select(
      "*, manager:profiles!comp_void_notes_manager_id_fkey(id, full_name, email, avatar_url)",
    )
    .eq("location_id", active.id)
    .order("occurred_at", { ascending: false })
    .limit(100);
  const notes = (data ?? []) as (CompVoidNote & {
    manager: ProfileLite | null;
  })[];

  return (
    <>
      <PageHeader
        title="Comp / Void Log"
        description={`Comps and voids at ${active.name}. Managers only.`}
      />

      {isManager ? (
        <div className="mb-6">
          <CompVoidForm locationId={active.id} />
        </div>
      ) : (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Manager-only entry</CardTitle>
            <CardDescription>
              Only managers can log comps and voids. Read access is open to
              anyone with location access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={ShieldAlert}
              title="Read-only"
              description="Ask a manager if something needs to be recorded."
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent entries</CardTitle>
          <CardDescription>
            Last 100 comp / void notes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompVoidList
            notes={notes}
            canDelete={profile.role === "founder_admin"}
          />
        </CardContent>
      </Card>
    </>
  );
}

import { LayoutDashboard } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { requireUser } from "@/lib/auth/get-user";

export default async function DashboardPage() {
  const { profile, locations } = await requireUser();

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name ?? "team"}`}
        description="Your home base. Today's priorities, open issues, and what changed will live here."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
            <CardDescription>{ROLE_LABELS[profile.role]}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>
              {locations.length === 0
                ? "No locations assigned yet."
                : locations.map((l) => l.name).join(" · ")}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Today&apos;s Priorities</CardTitle>
            <CardDescription>
              Coming in Phase 3 once Daily Ops ships.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <div className="flex h-20 items-center justify-center rounded-md border border-dashed">
              <LayoutDashboard className="h-5 w-5 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

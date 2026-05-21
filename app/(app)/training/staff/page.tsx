import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { StaffRosterTable } from "@/components/admin/training/staff-roster-table";
import { CreateStaffDialog } from "@/components/admin/training/create-staff-dialog";
import { requireUser } from "@/lib/auth/get-user";
import { canWriteContent, listAllTrainingStaff } from "@/lib/server/training";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  TRAINING_STAFF_TYPE_LABELS,
  TRAINING_STAFF_TYPES,
} from "@/lib/constants/training";

export const dynamic = "force-dynamic";

export default async function StaffRosterPage() {
  const { profile } = await requireUser();
  if (!canWriteContent(profile.role)) redirect("/training");

  const supabase = createSupabaseServerClient();
  const [staff, locationsRes] = await Promise.all([
    listAllTrainingStaff(),
    supabase
      .from("locations")
      .select("id, name")
      .eq("is_active", true)
      .order("sort_order"),
  ]);
  const locations = (locationsRes.data ?? []) as { id: string; name: string }[];

  const byType = new Map<string, number>();
  for (const s of staff) {
    if (!s.is_active) continue;
    byType.set(s.staff_type, (byType.get(s.staff_type) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader
        title="Surf School staff"
        description="Roster of FOH, BOH, and Management trainees. Each one signs into the kiosk with a PIN."
        action={
          <div className="flex gap-2">
            <Link
              href="/learn/kiosk"
              target="_blank"
              className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Open kiosk
            </Link>
            <CreateStaffDialog locations={locations} />
          </div>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        {TRAINING_STAFF_TYPES.map((t) => (
          <Card key={t}>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {TRAINING_STAFF_TYPE_LABELS[t]}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-3xl font-semibold tabular-nums">
                {byType.get(t) ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff roster</CardTitle>
          <CardDescription>
            Active staff can sign into the kiosk at{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              /learn/kiosk
            </code>
            . Inactive staff can&apos;t.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {staff.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff yet"
              description="Add your first trainee to get started."
            />
          ) : (
            <StaffRosterTable staff={staff} locations={locations} />
          )}
        </CardContent>
      </Card>
    </>
  );
}

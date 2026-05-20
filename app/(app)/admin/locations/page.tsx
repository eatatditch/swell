import { MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/data/empty-state";
import { LocationRow } from "@/components/admin/locations/location-row";
import { NewLocationDialog } from "@/components/admin/locations/new-location-dialog";
import { requireAdmin } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/types/database";

export default async function AdminLocationsPage() {
  await requireAdmin();
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order");
  const rows = (data ?? []) as Location[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Locations</CardTitle>
          <CardDescription>
            Add new locations, rename them, change their order, or take them
            offline.
          </CardDescription>
        </div>
        <NewLocationDialog />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations"
            description="Add your first location to get going."
          />
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map((l) => (
              <LocationRow key={l.id} location={l} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

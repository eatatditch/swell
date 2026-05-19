import { MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/data/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/types/database";

export default async function AdminLocationsPage() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("*")
    .order("sort_order");
  const rows = (data ?? []) as Location[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Locations</CardTitle>
        <CardDescription>
          The four operating scopes. Editing locations arrives in Phase 12.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="No locations"
            description="Locations are seeded in the initial migration."
          />
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{l.name}</p>
                  <p className="text-xs text-muted-foreground">{l.slug}</p>
                </div>
                <Badge variant={l.is_active ? "secondary" : "outline"}>
                  {l.is_active ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

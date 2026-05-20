import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LocationGate } from "@/components/daily-ops/location-gate";
import { EightySixedList } from "@/components/daily-ops/eighty-sixed/eighty-sixed-list";
import { cn } from "@/lib/utils";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import type { EightySixedItem, ProfileLite } from "@/lib/types/database";

interface PageProps {
  searchParams: { show?: string };
}

export default async function EightySixedPage({ searchParams }: PageProps) {
  const { profile, locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  if (!active) {
    return (
      <>
        <PageHeader
          title="86'd Items"
          description="What's currently off the menu."
        />
        <LocationGate multiLocation={locations.length > 1} />
      </>
    );
  }

  const showResolved = searchParams.show === "resolved";

  const supabase = createSupabaseServerClient();
  let query = supabase
    .from("eighty_sixed_items")
    .select(
      "*, creator:profiles!eighty_sixed_items_created_by_fkey(id, full_name, email, avatar_url)",
    )
    .eq("location_id", active.id)
    .order("created_at", { ascending: false });
  if (showResolved) {
    query = query.not("resolved_at", "is", null);
  } else {
    query = query.is("resolved_at", null);
  }
  const { data, error } = await query;
  if (error) console.error("eighty_sixed_items select:", error);
  const items = (data ?? []) as (EightySixedItem & {
    creator: ProfileLite | null;
  })[];

  return (
    <>
      <PageHeader
        title="86'd Items"
        description={`What's currently off the menu at ${active.name}.`}
      />

      <div className="mb-4 flex gap-1.5">
        <Link
          href="/daily-ops/86d"
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            !showResolved
              ? "border-foreground bg-foreground text-background"
              : "border-input bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Active
        </Link>
        <Link
          href="/daily-ops/86d?show=resolved"
          className={cn(
            "rounded-full border px-3 py-1 text-xs transition-colors",
            showResolved
              ? "border-foreground bg-foreground text-background"
              : "border-input bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          Back on
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {showResolved ? "Back on the menu" : "Currently 86'd"}
          </CardTitle>
          <CardDescription>
            {showResolved
              ? "Resolved entries — for reference."
              : "Add what's out, why, and until when."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EightySixedList
            locationId={active.id}
            currentUserId={profile.id}
            items={items}
          />
        </CardContent>
      </Card>
    </>
  );
}

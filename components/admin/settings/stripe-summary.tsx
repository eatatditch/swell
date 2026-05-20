import Link from "next/link";
import { ArrowUpRight, CheckCircle2, CircleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CateringSettings, Location } from "@/lib/types/database";

interface StripeSummaryProps {
  locations: Location[];
  settings: CateringSettings[];
}

// Server component — read-only summary that links to the existing
// per-location Stripe Connect onboarding flow under /catering/settings.
export function StripeSummary({ locations, settings }: StripeSummaryProps) {
  const byLocation = new Map<string, CateringSettings>();
  for (const s of settings) {
    if (s.location_id) byLocation.set(s.location_id, s);
  }
  const locs = locations.filter((l) => l.slug !== "company_wide");

  return (
    <div className="divide-y rounded-md border">
      {locs.map((l) => {
        const s = byLocation.get(l.id);
        const connected = Boolean(s?.stripe_account_id);
        const live = Boolean(s?.stripe_charges_enabled);
        return (
          <div
            key={l.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div className="flex items-center gap-3">
              {connected && live ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : (
                <CircleAlert className="h-5 w-5 text-amber-500" />
              )}
              <div>
                <p className="text-sm font-medium">{l.name}</p>
                <p className="text-xs text-muted-foreground">
                  {connected
                    ? live
                      ? "Connected and accepting payments"
                      : "Connected, pending verification"
                    : "Not connected to Stripe yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connected ? (
                <Badge variant={live ? "secondary" : "outline"}>
                  {live ? "Live" : "Pending"}
                </Badge>
              ) : null}
              <Button asChild variant="outline" size="sm" className="gap-1.5">
                <Link href="/catering/settings">
                  Manage
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

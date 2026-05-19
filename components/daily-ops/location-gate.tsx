import { MapPin } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";

export function LocationGate({
  multiLocation,
}: {
  multiLocation: boolean;
}) {
  return (
    <EmptyState
      icon={MapPin}
      title={multiLocation ? "Pick a location" : "No location assigned"}
      description={
        multiLocation
          ? "Daily Ops scopes to one venue at a time. Use the location switcher up top."
          : "You don't have access to a location yet. Ask an admin to assign you."
      }
    />
  );
}

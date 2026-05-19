import { Heart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function GuestsPage() {
  return (
    <ModuleShell
      title="Guests"
      description="Guest profiles, VIPs, preferences."
      icon={Heart}
      emptyTitle="Phase 9"
    />
  );
}

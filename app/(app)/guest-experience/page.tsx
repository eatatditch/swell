import { Heart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function GuestExperiencePage() {
  return (
    <ModuleShell
      title="Guest Experience"
      description="Guests, VIPs, recoveries, reviews."
      icon={Heart}
      emptyTitle="Phase 9"
      emptyDescription="Guest profiles, recoveries, review tracking, and Surf Club opportunities will live here."
    />
  );
}

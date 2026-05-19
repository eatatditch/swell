import { Heart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function RecoveryPage() {
  return (
    <ModuleShell
      title="Recovery"
      description="Guest recovery log and status."
      icon={Heart}
      emptyTitle="Phase 9"
    />
  );
}

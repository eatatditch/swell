import { ChefHat } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function WastePage() {
  return (
    <ModuleShell
      title="Waste"
      description="Waste log entry and history."
      icon={ChefHat}
      emptyTitle="Phase 6"
    />
  );
}

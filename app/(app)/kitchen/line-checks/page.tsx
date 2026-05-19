import { ChefHat } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function LineChecksPage() {
  return (
    <ModuleShell
      title="Line Checks"
      description="Today's line checks and history."
      icon={ChefHat}
      emptyTitle="Phase 6"
    />
  );
}

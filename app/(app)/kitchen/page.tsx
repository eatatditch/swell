import { ChefHat } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function KitchenPage() {
  return (
    <ModuleShell
      title="Kitchen"
      description="Prep, par levels, line checks, waste, vendor & equipment issues."
      icon={ChefHat}
      emptyTitle="Phase 6"
      emptyDescription="Prep lists, par levels, line checks, and waste logs will live here."
    />
  );
}

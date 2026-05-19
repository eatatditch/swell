import { ChefHat } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function KitchenPrepPage() {
  return (
    <ModuleShell
      title="Prep"
      description="Prep lists, par levels, ordering notes."
      icon={ChefHat}
      emptyTitle="Phase 6"
    />
  );
}

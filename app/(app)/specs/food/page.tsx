import { BookOpen } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function FoodSpecsPage() {
  return (
    <ModuleShell
      title="Food Specs"
      description="Food specs and build sheets."
      icon={BookOpen}
      emptyTitle="Phase 5"
    />
  );
}

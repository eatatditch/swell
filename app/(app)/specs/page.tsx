import { BookOpen } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function SpecsPage() {
  return (
    <ModuleShell
      title="Specs & Menus"
      description="Food specs, cocktails, build sheets, allergens, plating."
      icon={BookOpen}
      emptyTitle="Phase 5"
      emptyDescription="Recipes, plating standards, allergen matrix, and version history will live here."
    />
  );
}

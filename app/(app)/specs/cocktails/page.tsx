import { BookOpen } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CocktailSpecsPage() {
  return (
    <ModuleShell
      title="Cocktail Specs"
      description="Cocktail recipes and garnishes."
      icon={BookOpen}
      emptyTitle="Phase 5"
    />
  );
}

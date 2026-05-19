import { BookOpen } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function MenuItemsPage() {
  return (
    <ModuleShell
      title="Menu Items"
      description="Menu items, status, season, allergens."
      icon={BookOpen}
      emptyTitle="Phase 5"
    />
  );
}

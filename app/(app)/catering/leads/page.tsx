import { CalendarHeart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CateringLeadsPage() {
  return (
    <ModuleShell
      title="Leads"
      description="Catering pipeline."
      icon={CalendarHeart}
      emptyTitle="Phase 7"
    />
  );
}

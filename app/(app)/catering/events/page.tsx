import { CalendarHeart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CateringEventsPage() {
  return (
    <ModuleShell
      title="Events"
      description="Booked events and BEO detail."
      icon={CalendarHeart}
      emptyTitle="Phase 7"
    />
  );
}

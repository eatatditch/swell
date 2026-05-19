import { CalendarHeart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CateringCalendarPage() {
  return (
    <ModuleShell
      title="Calendar"
      description="Calendar view of events."
      icon={CalendarHeart}
      emptyTitle="Phase 7"
    />
  );
}

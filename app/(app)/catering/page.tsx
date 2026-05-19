import { CalendarHeart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CateringPage() {
  return (
    <ModuleShell
      title="Catering & Events"
      description="Leads, follow-ups, BEOs, payments, calendar."
      icon={CalendarHeart}
      emptyTitle="Phase 7"
      emptyDescription="Pipeline, BEOs, payments, UGC opportunities, and post-event tracking will live here."
    />
  );
}

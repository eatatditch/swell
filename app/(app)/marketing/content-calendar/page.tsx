import { Megaphone } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function ContentCalendarPage() {
  return (
    <ModuleShell
      title="Content Calendar"
      description="Posts, stories, emails, and SMS planned out."
      icon={Megaphone}
      emptyTitle="Phase 8"
    />
  );
}

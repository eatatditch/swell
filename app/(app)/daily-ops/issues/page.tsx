import { ClipboardList } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function DailyOpsIssuesPage() {
  return (
    <ModuleShell
      title="Issues"
      description="Maintenance, 86'd items, staff notes, comp/void log."
      icon={ClipboardList}
      emptyTitle="Phase 3"
      emptyDescription="Open issues across categories will live here."
    />
  );
}

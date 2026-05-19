import { ClipboardList } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function DailyOpsLogsPage() {
  return (
    <ModuleShell
      title="Manager Logs"
      description="Narrative shift logs and handoffs."
      icon={ClipboardList}
      emptyTitle="Phase 3"
      emptyDescription="Manager logs and shift handoff notes will live here."
    />
  );
}

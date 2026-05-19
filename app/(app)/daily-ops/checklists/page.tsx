import { ClipboardList } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function DailyOpsChecklistsPage() {
  return (
    <ModuleShell
      title="Checklists"
      description="Opening, closing, and pre-shift checklists."
      icon={ClipboardList}
      emptyTitle="Phase 3"
      emptyDescription="Templates and today's runs land here."
    />
  );
}

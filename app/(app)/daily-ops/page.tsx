import { ClipboardList } from "lucide-react";

import { ModuleShell } from "@/components/layout/module-shell";

export default function DailyOpsPage() {
  return (
    <ModuleShell
      title="Daily Ops"
      description="Opening, closing, manager logs, handoffs, issues."
      icon={ClipboardList}
      emptyTitle="Phase 3"
      emptyDescription="Checklists, manager logs, shift notes, 86'd items, maintenance, and comp/void notes will live here."
    />
  );
}

import { Compass } from "lucide-react";

import { ModuleShell } from "@/components/layout/module-shell";
import { requireAdmin } from "@/lib/auth/get-user";

export default async function FounderPage() {
  await requireAdmin();
  return (
    <ModuleShell
      title="Founder View"
      description="Weekly review. Priorities, decisions, cash, accountability."
      icon={Compass}
      emptyTitle="Phase 11"
      emptyDescription="Strategic priorities, decision logs, cash snapshots, company-wide issues, and accountability roll-up land here."
    />
  );
}

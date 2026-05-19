import { Megaphone } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function MarketingPage() {
  return (
    <ModuleShell
      title="Marketing"
      description="Campaigns, content calendar, shot lists, UGC."
      icon={Megaphone}
      emptyTitle="Phase 8"
      emptyDescription="Campaign calendar, creative briefs, ad requests, and approval workflow will live here."
    />
  );
}

import { Megaphone } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function CampaignsPage() {
  return (
    <ModuleShell
      title="Campaigns"
      description="Active and upcoming campaigns."
      icon={Megaphone}
      emptyTitle="Phase 8"
    />
  );
}

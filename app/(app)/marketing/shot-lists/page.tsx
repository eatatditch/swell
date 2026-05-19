import { Megaphone } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function ShotListsPage() {
  return (
    <ModuleShell
      title="Shot Lists"
      description="Shot lists for upcoming shoots."
      icon={Megaphone}
      emptyTitle="Phase 8"
    />
  );
}

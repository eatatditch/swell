import { GraduationCap } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function TrainingProgressPage() {
  return (
    <ModuleShell
      title="Progress"
      description="Progress matrix for managers."
      icon={GraduationCap}
      emptyTitle="Phase 4"
    />
  );
}

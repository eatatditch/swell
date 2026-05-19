import { GraduationCap } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function TrainingLessonsPage() {
  return (
    <ModuleShell
      title="Lessons"
      description="Lesson player."
      icon={GraduationCap}
      emptyTitle="Phase 4"
    />
  );
}

import { GraduationCap } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function TrainingCoursesPage() {
  return (
    <ModuleShell
      title="Courses"
      description="All courses, filtered by role and department."
      icon={GraduationCap}
      emptyTitle="Phase 4"
    />
  );
}

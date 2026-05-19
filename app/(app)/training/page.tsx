import { GraduationCap } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function TrainingPage() {
  return (
    <ModuleShell
      title="Surf School"
      description="Courses, lessons, quizzes, progress, sign-offs."
      icon={GraduationCap}
      emptyTitle="Phase 4"
      emptyDescription="Categories, role-based paths, manager sign-offs, and certifications will live here."
    />
  );
}

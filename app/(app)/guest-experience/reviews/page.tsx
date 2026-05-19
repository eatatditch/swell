import { Heart } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function ReviewsPage() {
  return (
    <ModuleShell
      title="Reviews"
      description="Review tracking and response status."
      icon={Heart}
      emptyTitle="Phase 9"
    />
  );
}

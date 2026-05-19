import { BarChart3 } from "lucide-react";
import { ModuleShell } from "@/components/layout/module-shell";

export default function ScoreboardPage() {
  return (
    <ModuleShell
      title="Scoreboard"
      description="Sales, labor, COGS, prime cost, check average, recaps."
      icon={BarChart3}
      emptyTitle="Phase 10"
      emptyDescription="KPI entry, weekly recap, manager scorecard, and Recharts dashboards will live here."
    />
  );
}

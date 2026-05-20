import { Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/data/empty-state";
import { cn } from "@/lib/utils";
import type { AccountabilityRow } from "@/lib/server/founder";

function initials(name: string | null, email: string | null) {
  const s = (name ?? email ?? "·").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function AccountabilityBoard({
  rows,
}: {
  rows: AccountabilityRow[];
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Nothing assigned"
        description="Once tasks, issues, or manager logs are in play, this board fills up."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 font-medium">Person</th>
            <th className="px-3 py-2 text-right font-medium">Open tasks</th>
            <th className="px-3 py-2 text-right font-medium">Overdue</th>
            <th className="px-3 py-2 text-right font-medium">Issues</th>
            <th className="px-3 py-2 text-right font-medium">Logs (7d)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.profile.id}
              className="border-t border-border align-middle"
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {row.profile.avatar_url ? (
                      <AvatarImage src={row.profile.avatar_url} alt="" />
                    ) : null}
                    <AvatarFallback className="text-[10px]">
                      {initials(row.profile.full_name, row.profile.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {row.profile.full_name ?? row.profile.email ?? "—"}
                    </p>
                    {row.profile.full_name && row.profile.email ? (
                      <p className="truncate text-xs text-muted-foreground">
                        {row.profile.email}
                      </p>
                    ) : null}
                  </div>
                </div>
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.openTasks}
              </td>
              <td
                className={cn(
                  "px-3 py-2 text-right tabular-nums",
                  row.overdueTasks > 0 && "font-semibold text-rose-600",
                )}
              >
                {row.overdueTasks}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.openIssues}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {row.managerLogs7d}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

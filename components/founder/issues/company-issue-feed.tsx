import Link from "next/link";
import { CheckCircle2, ListTodo, Wrench, UserRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { cn } from "@/lib/utils";
import type { CompanyIssue } from "@/lib/server/founder";

const KIND_META: Record<
  CompanyIssue["kind"],
  { icon: LucideIcon; label: string; tone: string }
> = {
  task: {
    icon: ListTodo,
    label: "Task",
    tone: "text-primary",
  },
  maintenance: {
    icon: Wrench,
    label: "Maintenance",
    tone: "text-accent",
  },
  guest_incident: {
    icon: UserRound,
    label: "Guest",
    tone: "text-rose-600",
  },
};

export function CompanyIssueFeed({ issues }: { issues: CompanyIssue[] }) {
  if (issues.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Nothing open across the company"
        description="No open tasks, maintenance issues, or guest incidents anywhere right now."
      />
    );
  }

  return (
    <ul className="divide-y divide-border">
      {issues.map((issue) => {
        const meta = KIND_META[issue.kind];
        const Icon = meta.icon;
        return (
          <li key={`${issue.kind}-${issue.id}`} className="py-3">
            <Link
              href={issue.href}
              className="flex items-start gap-3 group"
            >
              <span
                className={cn(
                  "mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted",
                  meta.tone,
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {meta.label}
                  {issue.location ? ` · ${issue.location.name}` : null}
                  {issue.priority ? ` · ${issue.priority}` : null}
                </p>
                <p className="mt-0.5 truncate text-sm font-medium group-hover:underline">
                  {issue.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {issue.detail ? `${issue.detail} · ` : null}
                  {issue.owner
                    ? `${issue.owner.full_name ?? issue.owner.email ?? "Someone"} · `
                    : null}
                  {relative(issue.created_at)}
                </p>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function relative(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

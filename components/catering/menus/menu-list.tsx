import Link from "next/link";
import { Archive, BookOpen } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { SERVICE_TYPE_LABELS } from "@/lib/constants/catering";
import type { MenuWithStats } from "@/lib/server/catering-menus";

export function MenuList({ menus }: { menus: MenuWithStats[] }) {
  if (menus.length === 0) {
    return (
      <EmptyState
        icon={BookOpen}
        title="No menus yet"
        description="Build reusable menus once and attach them to quotes and events."
      />
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {menus.map((m) => (
        <Link
          key={m.id}
          href={`/catering/menus/${m.id}`}
          className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold leading-tight">{m.name}</p>
              <p className="text-xs text-muted-foreground">
                {SERVICE_TYPE_LABELS[m.default_service_type]}
              </p>
            </div>
            {m.is_archived ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Archive className="h-3 w-3" />
                Archived
              </span>
            ) : null}
          </div>
          {m.description ? (
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
              {m.description}
            </p>
          ) : null}
          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              <strong className="tabular-nums text-foreground">{m.section_count}</strong>{" "}
              section{m.section_count === 1 ? "" : "s"}
            </span>
            <span>
              <strong className="tabular-nums text-foreground">{m.item_count}</strong>{" "}
              item{m.item_count === 1 ? "" : "s"}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

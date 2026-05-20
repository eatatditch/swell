import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils";
import type { InboxThread } from "@/lib/server/inbox";

interface InboxListProps {
  threads: InboxThread[];
  activeThreadId?: string | null;
}

export function InboxList({ threads, activeThreadId }: InboxListProps) {
  if (threads.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
        Nothing here yet. Inbound mail from known catering contacts syncs
        every few minutes and shows up here.
      </div>
    );
  }
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {threads.map((t) => {
        const isActive = t.thread_id === activeThreadId;
        const Icon = t.last_direction === "inbound" ? ArrowDownLeft : ArrowUpRight;
        return (
          <li key={t.thread_id}>
            <Link
              href={`/catering/mail/${encodeURIComponent(t.thread_id)}`}
              className={cn(
                "flex items-start gap-3 px-3 py-3 transition hover:bg-muted/40",
                isActive && "bg-muted/60",
                t.unread_count > 0 && "bg-accent/5",
              )}
            >
              <Icon
                className={cn(
                  "mt-0.5 h-4 w-4 shrink-0",
                  t.last_direction === "inbound"
                    ? "text-emerald-600"
                    : "text-muted-foreground",
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p
                    className={cn(
                      "truncate text-sm",
                      t.unread_count > 0 ? "font-bold" : "font-semibold",
                    )}
                  >
                    {t.contact_name ?? "(unmatched contact)"}
                  </p>
                  <p className="whitespace-nowrap text-[11px] text-muted-foreground">
                    {new Date(t.last_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
                <p
                  className={cn(
                    "truncate text-xs",
                    t.unread_count > 0
                      ? "text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {t.last_subject ?? "(no subject)"}
                </p>
                {t.last_snippet ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                    {t.last_snippet}
                  </p>
                ) : null}
              </div>
              {t.unread_count > 0 ? (
                <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-accent-foreground">
                  {t.unread_count}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

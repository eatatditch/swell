"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Calendar, GripVertical, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteContentItem,
  updateContentItemStatus,
} from "@/components/marketing/actions";
import {
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
  contentStatusTone,
} from "@/lib/constants/marketing";
import type { ContentItem, ContentStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

interface Props {
  items: ContentItem[];
  campaignNamesById: Record<string, string>;
}

export function ContentBoard({ items: initial, campaignNamesById }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ContentStatus | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync when server data changes.
  useEffect(() => {
    setItems(initial);
  }, [initial]);

  function move(item: ContentItem, target: ContentStatus) {
    if (item.status === target) return;
    setItems((cur) =>
      cur.map((i) => (i.id === item.id ? { ...i, status: target } : i)),
    );
    startTransition(async () => {
      const res = await updateContentItemStatus(item.id, target);
      if ("error" in res && res.error) {
        // Revert
        setItems((cur) =>
          cur.map((i) =>
            i.id === item.id ? { ...i, status: item.status } : i,
          ),
        );
      }
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Delete this content item?")) return;
    setItems((cur) => cur.filter((i) => i.id !== id));
    startTransition(async () => {
      await deleteContentItem(id);
      router.refresh();
    });
  }

  const byStatus = new Map<ContentStatus, ContentItem[]>();
  for (const s of CONTENT_STATUSES) byStatus.set(s, []);
  for (const item of items) {
    const arr = byStatus.get(item.status) ?? [];
    arr.push(item);
    byStatus.set(item.status, arr);
  }

  return (
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[1100px] auto-cols-[minmax(220px,1fr)] grid-flow-col gap-3">
        {CONTENT_STATUSES.map((col) => {
          const cards = byStatus.get(col) ?? [];
          const isOver = overColumn === col;
          return (
            <div
              key={col}
              onDragOver={(e) => {
                e.preventDefault();
                setOverColumn(col);
              }}
              onDragLeave={(e) => {
                if (
                  e.currentTarget.contains(
                    (e.relatedTarget as Node) ?? null,
                  )
                )
                  return;
                setOverColumn((c) => (c === col ? null : c));
              }}
              onDrop={(e) => {
                e.preventDefault();
                setOverColumn(null);
                const id = e.dataTransfer.getData("text/plain");
                const item = items.find((i) => i.id === id);
                if (item) move(item, col);
              }}
              className={cn(
                "flex flex-col rounded-2xl p-3 transition-colors",
                isOver ? "bg-accent/15 ring-2 ring-accent" : "bg-muted/40",
              )}
            >
              <div className="mb-2 flex items-baseline justify-between">
                <p
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-semibold",
                    contentStatusTone(col),
                  )}
                >
                  {CONTENT_STATUS_LABELS[col]}
                </p>
                <span className="text-xs text-muted-foreground">
                  {cards.length}
                </span>
              </div>
              <div className="space-y-2">
                {cards.length === 0 ? (
                  <p className="rounded-md border border-dashed bg-card/40 p-3 text-xs text-muted-foreground">
                    {isOver ? "Drop here" : "Nothing here."}
                  </p>
                ) : (
                  cards.map((c) => (
                    <CardView
                      key={c.id}
                      item={c}
                      campaignName={
                        c.campaign_id
                          ? campaignNamesById[c.campaign_id] ?? null
                          : null
                      }
                      onDragStart={() => setDraggingId(c.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverColumn(null);
                      }}
                      onDelete={() => remove(c.id)}
                      onMove={(target) => move(c, target)}
                      dragging={draggingId === c.id}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CardView({
  item,
  campaignName,
  onDragStart,
  onDragEnd,
  onDelete,
  onMove,
  dragging,
}: {
  item: ContentItem;
  campaignName: string | null;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDelete: () => void;
  onMove: (target: ContentStatus) => void;
  dragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group rounded-md border bg-card p-3 text-xs shadow-sm transition-opacity",
        dragging && "opacity-50",
      )}
    >
      <div className="flex items-start gap-1">
        <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{item.title}</p>
          <p className="mt-0.5 text-muted-foreground">
            {CONTENT_CHANNEL_LABELS[item.channel]}
            {item.scheduled_for ? (
              <span className="ml-1 inline-flex items-center gap-0.5">
                · <Calendar className="h-3 w-3" />{" "}
                {item.scheduled_for.slice(0, 10)}
              </span>
            ) : null}
          </p>
          {campaignName ? (
            <p className="mt-0.5 text-[11px] text-accent">{campaignName}</p>
          ) : null}
          {item.caption ? (
            <p className="mt-1 line-clamp-2 italic text-foreground/80">
              “{item.caption}”
            </p>
          ) : null}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100"
            >
              <span className="text-xs">···</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {CONTENT_STATUSES.filter((s) => s !== item.status).map((s) => (
              <DropdownMenuItem key={s} onClick={() => onMove(s)}>
                Move to {CONTENT_STATUS_LABELS[s]}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              onClick={onDelete}
              className="text-rose-600"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

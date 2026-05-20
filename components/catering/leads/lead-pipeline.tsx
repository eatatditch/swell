"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import { LeadCardBody } from "@/components/catering/leads/lead-card";
import { moveLeadInPipeline } from "@/components/catering/leads/actions";
import {
  LEAD_STAGE_PROBABILITY,
  LEAD_STAGE_STRIPE,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  formatCents,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type { LeadWithOwner } from "@/lib/server/catering";
import type { CateringLeadStatus } from "@/lib/types/database";

interface LeadPipelineProps {
  leads: LeadWithOwner[];
}

export function LeadPipeline({ leads }: LeadPipelineProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Local copy so drag-drop feels instant.
  const [items, setItems] = useState(leads);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    setItems(leads);
  }, [leads]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const grouped = useMemo(() => {
    const m = new Map<CateringLeadStatus, LeadWithOwner[]>();
    for (const s of LEAD_STATUSES) m.set(s, []);
    for (const l of items) {
      const arr = m.get(l.status);
      if (arr) arr.push(l);
    }
    for (const [, arr] of m) {
      arr.sort((a, b) => a.pipeline_position - b.pipeline_position);
    }
    return m;
  }, [items]);

  const totalValue = items.reduce(
    (sum, l) => sum + (l.estimated_value_cents ?? 0),
    0,
  );

  const activeLead = activeId ? items.find((l) => l.id === activeId) : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const lead = items.find((l) => l.id === active.id);
    if (!lead) return;

    const overData = over.data.current as
      | { type: "column"; status: CateringLeadStatus }
      | { type: "card"; status: CateringLeadStatus; position: number }
      | undefined;
    if (!overData) return;

    const targetStatus = overData.status;
    const sameColumn = lead.status === targetStatus;
    let targetPosition: number;
    if (overData.type === "column") {
      // Dropped on empty area — append.
      targetPosition = (grouped.get(targetStatus) ?? []).length;
    } else {
      targetPosition = overData.position;
    }

    if (sameColumn && lead.pipeline_position === targetPosition) return;

    // Optimistic local reorder.
    const next = items.map((l) => ({ ...l }));
    const moving = next.find((l) => l.id === lead.id);
    if (!moving) return;
    const oldStatus = moving.status;
    moving.status = targetStatus;
    moving.pipeline_position = targetPosition;

    for (const l of next) {
      if (l.id === moving.id) continue;
      if (l.status === targetStatus && l.pipeline_position >= targetPosition) {
        l.pipeline_position += 1;
      }
    }
    if (!sameColumn) {
      let i = 0;
      for (const l of next
        .filter((l) => l.status === oldStatus && l.id !== moving.id)
        .sort((a, b) => a.pipeline_position - b.pipeline_position)) {
        l.pipeline_position = i++;
      }
    }
    setItems(next);

    startTransition(async () => {
      const res = await moveLeadInPipeline({
        leadId: moving.id,
        status: targetStatus,
        position: targetPosition,
      });
      if ("error" in res && res.error) {
        // Revert on failure.
        setItems(leads);
      }
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LEAD_STATUSES.map((status) => {
          const list = grouped.get(status) ?? [];
          const stageValue = list.reduce(
            (sum, l) => sum + (l.estimated_value_cents ?? 0),
            0,
          );
          return (
            <PipelineColumn
              key={status}
              status={status}
              leads={list}
              stageValue={stageValue}
              disabled={pending}
            />
          );
        })}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rounded-xl border border-border bg-card p-3 shadow-lg ring-1 ring-accent">
            <LeadCardBody lead={activeLead} />
          </div>
        ) : null}
      </DragOverlay>

      <p className="mt-3 text-xs text-muted-foreground">
        Drag cards between columns to advance, or click any card to open it.
        Total pipeline value:{" "}
        <span className="font-semibold tabular-nums text-foreground">
          {formatCents(totalValue)}
        </span>
      </p>
    </DndContext>
  );
}

function PipelineColumn({
  status,
  leads,
  stageValue,
  disabled,
}: {
  status: CateringLeadStatus;
  leads: LeadWithOwner[];
  stageValue: number;
  disabled?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${status}`,
    data: { type: "column", status },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "flex min-h-[320px] flex-col overflow-hidden rounded-2xl border border-border bg-muted/20",
        isOver ? "ring-2 ring-accent" : "",
      )}
    >
      <div className={cn("h-1 w-full", LEAD_STAGE_STRIPE[status])} />
      <header className="flex items-start justify-between gap-2 px-3 pt-3">
        <div className="min-w-0">
          <h3 className="font-display text-sm font-bold tracking-wide">
            {LEAD_STATUS_LABELS[status]}
          </h3>
          <p className="text-xs tabular-nums text-muted-foreground">
            {leads.length} · {formatCents(stageValue)}
          </p>
        </div>
        <span className="rounded-full bg-card px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {Math.round(LEAD_STAGE_PROBABILITY[status] * 100)}%
        </span>
      </header>

      <div className="flex flex-1 flex-col gap-2 px-2 pb-2 pt-3">
        {leads.map((lead, i) => (
          <DraggableLeadCard
            key={lead.id}
            lead={lead}
            position={i}
            disabled={disabled}
          />
        ))}
        {leads.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
            Drop here
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DraggableLeadCard({
  lead,
  position,
  disabled,
}: {
  lead: LeadWithOwner;
  position: number;
  disabled?: boolean;
}) {
  const dragId = lead.id;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: dragId,
    data: { type: "card", status: lead.status, position },
    disabled,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `drop-${dragId}`,
    data: { type: "card", status: lead.status, position },
  });

  function setRefs(node: HTMLDivElement | null) {
    setNodeRef(node);
    setDropRef(node);
  }

  return (
    <div
      ref={setRefs}
      className={cn(
        "group rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow",
        isDragging ? "opacity-40" : "hover:shadow-md",
        isOver ? "ring-2 ring-accent" : "",
      )}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <LeadCardBody lead={lead} />
      </div>
      <Link
        href={`/catering/leads/${lead.id}`}
        className="mt-2 inline-block text-[11px] font-medium uppercase tracking-wide text-muted-foreground hover:text-accent"
      >
        Open →
      </Link>
    </div>
  );
}

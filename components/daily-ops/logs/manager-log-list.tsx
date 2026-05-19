"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ShiftNumbersFields,
  ShiftNumbersState,
  centsToInput,
  numberToInput,
  toCents,
  toGuestCount,
} from "@/components/daily-ops/logs/shift-numbers-fields";
import {
  deleteManagerLog,
  updateManagerLog,
} from "@/components/daily-ops/logs/actions";
import { SHIFT_LABELS, formatCents } from "@/lib/constants/daily-ops";
import type { ManagerLog, ProfileLite, Role } from "@/lib/types/database";

interface ManagerLogListProps {
  logs: (ManagerLog & { author: ProfileLite | null })[];
  currentUserId: string;
  currentUserRole: Role;
  runLinks?: Record<string, string>;
}

export function ManagerLogList({
  logs,
  currentUserId,
  currentUserRole,
  runLinks,
}: ManagerLogListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <ul className="space-y-2">
      {logs.map((l) => (
        <li key={l.id} className="rounded-lg border bg-card p-4">
          {editingId === l.id ? (
            <LogEditForm
              log={l}
              onCancel={() => setEditingId(null)}
              onSaved={() => setEditingId(null)}
            />
          ) : (
            <LogView
              log={l}
              canManage={canManage(l, currentUserId, currentUserRole)}
              runHref={
                l.checklist_completion_id
                  ? runLinks?.[l.checklist_completion_id] ?? null
                  : null
              }
              onEdit={() => setEditingId(l.id)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

function canManage(
  log: ManagerLog,
  currentUserId: string,
  role: Role,
): boolean {
  return role === "founder_admin" || log.author_id === currentUserId;
}

interface LogViewProps {
  log: ManagerLog & { author: ProfileLite | null };
  canManage: boolean;
  runHref: string | null;
  onEdit: () => void;
}

function LogView({ log, canManage, runHref, onEdit }: LogViewProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const narrative = log.notes ?? log.body ?? "";
  const hasNumbers =
    log.sales_cents != null ||
    log.guest_count != null ||
    log.comps_cents != null ||
    log.voids_cents != null;
  const ppa =
    log.sales_cents != null && log.guest_count && log.guest_count > 0
      ? formatCents(Math.round(log.sales_cents / log.guest_count))
      : null;

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await deleteManagerLog(log.id);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {log.log_date} · {SHIFT_LABELS[log.shift]} ·{" "}
          {log.author?.full_name ?? log.author?.email ?? "Unknown"}
          {runHref ? (
            <>
              {" · "}
              <Link href={runHref} className="underline-offset-2 hover:underline">
                from checklist run
              </Link>
            </>
          ) : null}
        </p>
        {canManage ? (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onEdit}
              disabled={pending}
              className="h-7 w-7"
              aria-label="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={remove}
              disabled={pending}
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
      </div>

      {hasNumbers ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
          {log.sales_cents != null ? (
            <Stat label="Sales" value={formatCents(log.sales_cents)} />
          ) : null}
          {log.guest_count != null ? (
            <Stat label="Guests" value={String(log.guest_count)} />
          ) : null}
          {log.comps_cents != null ? (
            <Stat label="Comps" value={formatCents(log.comps_cents)} />
          ) : null}
          {log.voids_cents != null ? (
            <Stat label="Voids" value={formatCents(log.voids_cents)} />
          ) : null}
          {ppa ? <Stat label="PPA" value={ppa} /> : null}
        </dl>
      ) : null}

      {narrative ? (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">
          {narrative}
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

interface LogEditFormProps {
  log: ManagerLog;
  onCancel: () => void;
  onSaved: () => void;
}

function LogEditForm({ log, onCancel, onSaved }: LogEditFormProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(log.notes ?? log.body ?? "");
  const [numbers, setNumbers] = useState<ShiftNumbersState>({
    sales: centsToInput(log.sales_cents),
    guests: numberToInput(log.guest_count),
    comps: centsToInput(log.comps_cents),
    voids: centsToInput(log.voids_cents),
  });
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const hasAnyNumber =
    numbers.sales !== "" ||
    numbers.guests !== "" ||
    numbers.comps !== "" ||
    numbers.voids !== "";
  const canSave = notes.trim().length > 0 || hasAnyNumber;

  function save() {
    setError(null);
    if (!canSave) {
      setError("Add notes or at least one number");
      return;
    }
    startTransition(async () => {
      const res = await updateManagerLog({
        logId: log.id,
        notes: notes.trim() || null,
        salesCents: toCents(numbers.sales),
        guestCount: toGuestCount(numbers.guests),
        compsCents: toCents(numbers.comps),
        voidsCents: toCents(numbers.voids),
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onSaved();
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Editing · {log.log_date} · {SHIFT_LABELS[log.shift]}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onCancel}
          disabled={pending}
          className="h-7 w-7"
          aria-label="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <ShiftNumbersFields
        value={numbers}
        onChange={setNumbers}
        disabled={pending}
        idPrefix={`edit-${log.id}`}
      />
      <div className="space-y-1.5">
        <Label htmlFor={`edit-${log.id}-notes`}>Notes</Label>
        <Textarea
          id={`edit-${log.id}-notes`}
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          disabled={pending}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={pending || !canSave}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

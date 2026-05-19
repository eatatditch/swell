import type {
  ChecklistKind,
  CompVoidKind,
  HandoffShift,
  MaintenanceStatus,
  ManagerLog,
  Shift,
} from "@/lib/types/database";

export const CHECKLIST_KINDS: ChecklistKind[] = [
  "opening",
  "closing",
  "pre_shift",
  "cleaning",
];

export const CHECKLIST_KIND_LABELS: Record<ChecklistKind, string> = {
  opening: "Opening",
  closing: "Closing",
  pre_shift: "Pre-shift",
  cleaning: "Cleaning",
};

export const SHIFTS: Shift[] = ["am", "pm", "all"];

export const SHIFT_LABELS: Record<Shift, string> = {
  am: "AM",
  pm: "PM",
  all: "All day",
};

export const HANDOFF_SHIFTS: HandoffShift[] = ["am", "pm"];

export const MAINTENANCE_STATUSES: MaintenanceStatus[] = [
  "open",
  "in_progress",
  "resolved",
];

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
};

export const COMP_VOID_KINDS: CompVoidKind[] = ["comp", "void"];

export const COMP_VOID_KIND_LABELS: Record<CompVoidKind, string> = {
  comp: "Comp",
  void: "Void",
};

export function formatCents(amountCents: number): string {
  return (amountCents / 100).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function managerLogPreview(
  log: Pick<
    ManagerLog,
    "notes" | "body" | "sales_cents" | "guest_count" | "comps_cents" | "voids_cents"
  >,
): string {
  if (log.notes) return log.notes;
  if (log.body) return log.body;
  const bits: string[] = [];
  if (log.sales_cents != null) bits.push(`Sales ${formatCents(log.sales_cents)}`);
  if (log.guest_count != null) bits.push(`${log.guest_count} guests`);
  if (log.comps_cents != null) bits.push(`Comps ${formatCents(log.comps_cents)}`);
  if (log.voids_cents != null) bits.push(`Voids ${formatCents(log.voids_cents)}`);
  return bits.join(" · ") || "—";
}

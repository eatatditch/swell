import type {
  ChecklistKind,
  CompVoidKind,
  HandoffShift,
  MaintenanceStatus,
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

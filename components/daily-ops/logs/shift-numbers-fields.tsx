"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ShiftNumbersState {
  sales: string;
  guests: string;
  comps: string;
  voids: string;
}

export const EMPTY_SHIFT_NUMBERS: ShiftNumbersState = {
  sales: "",
  guests: "",
  comps: "",
  voids: "",
};

interface ShiftNumbersFieldsProps {
  value: ShiftNumbersState;
  onChange: (next: ShiftNumbersState) => void;
  disabled?: boolean;
  idPrefix?: string;
}

export function ShiftNumbersFields({
  value,
  onChange,
  disabled,
  idPrefix = "sn",
}: ShiftNumbersFieldsProps) {
  const ppa = perPersonAverage(value.sales, value.guests);

  function update<K extends keyof ShiftNumbersState>(
    key: K,
    next: ShiftNumbersState[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Money
          id={`${idPrefix}-sales`}
          label="Sales"
          value={value.sales}
          onChange={(v) => update("sales", v)}
          disabled={disabled}
        />
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-guests`}>Guest count</Label>
          <Input
            id={`${idPrefix}-guests`}
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            value={value.guests}
            onChange={(e) => update("guests", e.target.value)}
            disabled={disabled}
            placeholder="0"
          />
        </div>
        <Money
          id={`${idPrefix}-comps`}
          label="Comps"
          value={value.comps}
          onChange={(v) => update("comps", v)}
          disabled={disabled}
        />
        <Money
          id={`${idPrefix}-voids`}
          label="Voids"
          value={value.voids}
          onChange={(v) => update("voids", v)}
          disabled={disabled}
        />
      </div>
      {ppa ? (
        <p className="text-xs text-muted-foreground">{ppa} per person</p>
      ) : null}
    </div>
  );
}

interface MoneyProps {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

function Money({ id, label, value, onChange, disabled }: MoneyProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
          $
        </span>
        <Input
          id={id}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="0.00"
          className="pl-7"
        />
      </div>
    </div>
  );
}

function perPersonAverage(sales: string, guests: string): string | null {
  const s = Number(sales);
  const g = Number(guests);
  if (!Number.isFinite(s) || !Number.isFinite(g) || s <= 0 || g <= 0) {
    return null;
  }
  return `$${(s / g).toFixed(2)}`;
}

export function toCents(value: string): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export function toGuestCount(value: string): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function centsToInput(cents: number | null): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

export function numberToInput(value: number | null): string {
  if (value == null) return "";
  return String(value);
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CHECKLIST_KINDS,
  CHECKLIST_KIND_LABELS,
} from "@/lib/constants/daily-ops";
import {
  createChecklistTemplate,
  updateChecklistTemplate,
} from "@/components/checklists/actions";
import type {
  Checklist,
  ChecklistItem,
  ChecklistKind,
  Location,
} from "@/lib/types/database";

interface EditorItem {
  id?: string;
  label: string;
  requiresNote: boolean;
}

interface ChecklistTemplateEditorProps {
  mode: "create" | "edit";
  template?: Checklist;
  items?: ChecklistItem[];
  locations: Location[];
}

export function ChecklistTemplateEditor({
  mode,
  template,
  items,
  locations,
}: ChecklistTemplateEditorProps) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [kind, setKind] = useState<ChecklistKind>(
    template?.kind ?? "opening",
  );
  const [description, setDescription] = useState(template?.description ?? "");
  const [locationId, setLocationId] = useState<string>(
    template?.location_id ?? "",
  );
  const [isActive, setIsActive] = useState(template?.is_active ?? true);
  const [rows, setRows] = useState<EditorItem[]>(() =>
    items
      ? items
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((it) => ({
            id: it.id,
            label: it.label,
            requiresNote: it.requires_note,
          }))
      : [{ label: "", requiresNote: false }],
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function addRow() {
    setRows((r) => [...r, { label: "", requiresNote: false }]);
  }

  function removeRow(idx: number) {
    setRows((r) => r.filter((_, i) => i !== idx));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setRows((r) => {
      const next = r.slice();
      const target = idx + dir;
      if (target < 0 || target >= next.length) return r;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  }

  function updateRow(idx: number, patch: Partial<EditorItem>) {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  }

  function submit() {
    setError(null);
    const cleaned = rows
      .map((r) => ({ ...r, label: r.label.trim() }))
      .filter((r) => r.label.length > 0);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (cleaned.length === 0) {
      setError("Add at least one line item");
      return;
    }
    startTransition(async () => {
      if (mode === "edit" && template) {
        const res = await updateChecklistTemplate({
          templateId: template.id,
          name: name.trim(),
          kind,
          description: description.trim() || null,
          isActive,
          items: cleaned.map((r, i) => ({
            id: r.id,
            label: r.label,
            requiresNote: r.requiresNote,
            position: (i + 1) * 10,
          })),
        });
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        router.push("/daily-ops/checklists");
        router.refresh();
      } else {
        const res = await createChecklistTemplate({
          name: name.trim(),
          kind,
          description: description.trim() || null,
          locationId: locationId || null,
          items: cleaned.map((r) => ({
            label: r.label,
            requiresNote: r.requiresNote,
          })),
        });
        if ("error" in res && res.error) {
          setError(res.error);
          return;
        }
        router.push("/daily-ops/checklists");
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Opening — FOH"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="kind">Kind</Label>
          <select
            id="kind"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={kind}
            onChange={(e) => setKind(e.target.value as ChecklistKind)}
          >
            {CHECKLIST_KINDS.map((k) => (
              <option key={k} value={k}>
                {CHECKLIST_KIND_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional notes about when and how to run it"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {mode === "create" ? (
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <select
              id="location"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              <option value="">Company-wide (all locations)</option>
              {locations
                .filter((l) => l.slug !== "company_wide")
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
          </div>
        ) : null}

        {mode === "edit" ? (
          <label className="flex items-end gap-2 pb-1 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
            />
            Active (visible to run)
          </label>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Line items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            Add item
          </Button>
        </div>
        <ul className="space-y-2">
          {rows.map((row, idx) => (
            <li
              key={idx}
              className="flex flex-col gap-2 rounded-lg border bg-card p-3 sm:flex-row sm:items-center"
            >
              <span className="w-8 shrink-0 text-center text-xs text-muted-foreground">
                {idx + 1}
              </span>
              <Input
                value={row.label}
                onChange={(e) => updateRow(idx, { label: e.target.value })}
                placeholder="Item label"
                className="flex-1"
              />
              <label className="flex items-center gap-2 text-xs text-muted-foreground whitespace-nowrap">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={row.requiresNote}
                  onChange={(e) =>
                    updateRow(idx, { requiresNote: e.target.checked })
                  }
                />
                Requires note
              </label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveRow(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                  className="h-8 w-8"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => moveRow(idx, 1)}
                  disabled={idx === rows.length - 1}
                  aria-label="Move down"
                  className="h-8 w-8"
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(idx)}
                  aria-label="Remove"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={submit}
          disabled={pending}
        >
          {pending
            ? "Saving…"
            : mode === "edit"
              ? "Save changes"
              : "Create template"}
        </Button>
      </div>
    </div>
  );
}

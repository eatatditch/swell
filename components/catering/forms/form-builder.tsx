"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Eye,
  GripVertical,
  Mail,
  Phone,
  Plus,
  Hash,
  Calendar,
  Clock,
  CheckSquare,
  Circle,
  ListChecks,
  ChevronDown,
  Type,
  AlignLeft,
  Trash2,
  Columns,
  Square,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateLeadForm } from "@/components/catering/forms/actions";
import {
  CONTACT_FIELD_LABELS,
  FIELD_TYPE_LABELS,
  LEAD_FIELD_LABELS,
  cryptoId,
} from "@/lib/forms/schema";
import { cn } from "@/lib/utils";
import type {
  FormField,
  FormRow,
  FormSchema,
  FormSettings,
  LeadForm,
} from "@/lib/types/database";

interface FormBuilderProps {
  form: LeadForm;
  appUrl: string;
}

interface PaletteEntry {
  type: FormField["type"];
  label: string;
  icon: typeof Type;
}

const PALETTE: PaletteEntry[] = [
  { type: "text", label: FIELD_TYPE_LABELS.text, icon: Type },
  { type: "textarea", label: FIELD_TYPE_LABELS.textarea, icon: AlignLeft },
  { type: "email", label: FIELD_TYPE_LABELS.email, icon: Mail },
  { type: "phone", label: FIELD_TYPE_LABELS.phone, icon: Phone },
  { type: "number", label: FIELD_TYPE_LABELS.number, icon: Hash },
  { type: "date", label: FIELD_TYPE_LABELS.date, icon: Calendar },
  { type: "time", label: FIELD_TYPE_LABELS.time, icon: Clock },
  { type: "select", label: FIELD_TYPE_LABELS.select, icon: ChevronDown },
  { type: "radio", label: FIELD_TYPE_LABELS.radio, icon: Circle },
  {
    type: "checkbox_group",
    label: FIELD_TYPE_LABELS.checkbox_group,
    icon: ListChecks,
  },
  { type: "checkbox", label: FIELD_TYPE_LABELS.checkbox, icon: CheckSquare },
];

export function FormBuilder({ form, appUrl }: FormBuilderProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    kind: "palette" | "field";
    payload: PaletteEntry | FormField;
  } | null>(null);

  const [name, setName] = useState(form.name);
  const [description, setDescription] = useState(form.description ?? "");
  const [slug, setSlug] = useState(form.slug);
  const [active, setActive] = useState(form.active);
  const [schema, setSchema] = useState<FormSchema>(form.schema);
  const [settings, setSettings] = useState<FormSettings>(form.settings);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const selectedField = (() => {
    if (!selectedFieldId) return null;
    for (const row of schema.rows) {
      const f = row.fields.find((f) => f.id === selectedFieldId);
      if (f) return f;
    }
    return null;
  })();

  function mutateSchema(updater: (s: FormSchema) => FormSchema) {
    setSchema((s) => updater(s));
    setDirty(true);
  }

  function addRowFromPalette(palette: PaletteEntry, rowIndex?: number) {
    const newField = createField(palette.type);
    mutateSchema((s) => {
      const rows = [...s.rows];
      const insertAt =
        rowIndex == null
          ? rows.length
          : Math.max(0, Math.min(rowIndex, rows.length));
      rows.splice(insertAt, 0, {
        id: cryptoId(),
        columns: 1,
        fields: [newField],
      });
      return { ...s, rows };
    });
    setSelectedFieldId(newField.id);
  }

  function addFieldToRow(rowId: string, palette: PaletteEntry) {
    const newField = createField(palette.type);
    mutateSchema((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.id === rowId
          ? {
              ...r,
              fields: [...r.fields, newField].slice(0, r.columns),
              // Auto-expand to 2 columns if a 1-col row gets a second field.
              columns: r.fields.length === 1 && r.columns === 1 ? 2 : r.columns,
            }
          : r,
      ),
    }));
    setSelectedFieldId(newField.id);
  }

  function deleteField(fieldId: string) {
    mutateSchema((s) => ({
      ...s,
      rows: s.rows
        .map((r) => ({ ...r, fields: r.fields.filter((f) => f.id !== fieldId) }))
        .filter((r) => r.fields.length > 0),
    }));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }

  function updateField(fieldId: string, patch: Partial<FormField>) {
    mutateSchema((s) => ({
      ...s,
      rows: s.rows.map((r) => ({
        ...r,
        fields: r.fields.map((f) =>
          f.id === fieldId ? { ...f, ...patch } : f,
        ),
      })),
    }));
  }

  function setRowColumns(rowId: string, columns: 1 | 2) {
    mutateSchema((s) => ({
      ...s,
      rows: s.rows.map((r) =>
        r.id === rowId ? { ...r, columns, fields: r.fields.slice(0, columns) } : r,
      ),
    }));
  }

  function deleteRow(rowId: string) {
    mutateSchema((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== rowId) }));
  }

  function moveRow(fromIndex: number, toIndex: number) {
    mutateSchema((s) => ({ ...s, rows: arrayMove(s.rows, fromIndex, toIndex) }));
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    if (id.startsWith("palette:")) {
      const type = id.slice("palette:".length) as FormField["type"];
      const palette = PALETTE.find((p) => p.type === type);
      if (palette) setActiveDrag({ kind: "palette", payload: palette });
      return;
    }
    if (id.startsWith("row:")) {
      const rowId = id.slice("row:".length);
      const row = schema.rows.find((r) => r.id === rowId);
      if (row) {
        // Show first field as preview for row drag.
        setActiveDrag({
          kind: "field",
          payload: row.fields[0] ?? createField("text"),
        });
      }
      return;
    }
  }

  function onDragEnd(e: DragEndEvent) {
    const activeId = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveDrag(null);
    if (!overId) return;

    // Palette → canvas
    if (activeId.startsWith("palette:")) {
      const type = activeId.slice("palette:".length) as FormField["type"];
      const palette = PALETTE.find((p) => p.type === type);
      if (!palette) return;
      if (overId === "canvas-end") {
        addRowFromPalette(palette);
      } else if (overId.startsWith("row:")) {
        const rowId = overId.slice("row:".length);
        const row = schema.rows.find((r) => r.id === rowId);
        if (row && row.fields.length < 2) {
          addFieldToRow(rowId, palette);
        } else {
          const index = schema.rows.findIndex((r) => r.id === rowId);
          addRowFromPalette(palette, index + 1);
        }
      }
      return;
    }

    // Row reorder
    if (activeId.startsWith("row:") && overId.startsWith("row:")) {
      const fromIndex = schema.rows.findIndex(
        (r) => r.id === activeId.slice("row:".length),
      );
      const toIndex = schema.rows.findIndex(
        (r) => r.id === overId.slice("row:".length),
      );
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        moveRow(fromIndex, toIndex);
      }
    }
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await updateLeadForm({
        id: form.id,
        name,
        slug,
        description,
        active,
        schema,
        settings,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setDirty(false);
      router.refresh();
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="flex flex-1 flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="form-name">Form name</Label>
              <Input
                id="form-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="form-slug">URL slug</Label>
              <Input
                id="form-slug"
                value={slug}
                onChange={(e) => {
                  setSlug(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => {
                  setActive(e.target.checked);
                  setDirty(true);
                }}
              />
              Accepting submissions
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a
                href={`${appUrl}/f/${form.slug}`}
                target="_blank"
                rel="noreferrer"
                className="gap-1.5"
              >
                <Eye className="h-4 w-4" />
                Preview
              </a>
            </Button>
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={save}
              disabled={pending || !dirty}
            >
              {pending ? "Saving…" : dirty ? "Save changes" : "Saved"}
            </Button>
          </div>
        </div>

        <div className="space-y-1.5 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Label htmlFor="form-description">Public description (optional)</Label>
          <Textarea
            id="form-description"
            rows={2}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setDirty(true);
            }}
          />
        </div>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_280px]">
          <Palette />
          <Canvas
            schema={schema}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onDeleteField={deleteField}
            onSetRowColumns={setRowColumns}
            onDeleteRow={deleteRow}
          />
          <Properties
            field={selectedField}
            settings={settings}
            onChangeField={(patch) =>
              selectedField && updateField(selectedField.id, patch)
            }
            onChangeSettings={(patch) => {
              setSettings((s) => ({ ...s, ...patch }));
              setDirty(true);
            }}
          />
        </div>
      </div>

      <DragOverlay>
        {activeDrag ? (
          activeDrag.kind === "palette" ? (
            <PaletteChip
              entry={activeDrag.payload as PaletteEntry}
              dragging
            />
          ) : (
            <div className="rounded-md border border-primary bg-card px-3 py-2 text-sm font-semibold shadow-md">
              {(activeDrag.payload as FormField).label || "Field"}
            </div>
          )
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Palette() {
  return (
    <aside className="space-y-2 rounded-2xl border border-border bg-card p-3 shadow-sm">
      <p className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Fields
      </p>
      <div className="space-y-1.5">
        {PALETTE.map((p) => (
          <DraggablePaletteChip key={p.type} entry={p} />
        ))}
      </div>
      <p className="px-1 pt-2 text-[11px] text-muted-foreground">
        Drag a field onto the canvas, or drop it inside a row to make a 2-column
        layout.
      </p>
    </aside>
  );
}

function DraggablePaletteChip({ entry }: { entry: PaletteEntry }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette:${entry.type}`,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-40")}
    >
      <PaletteChip entry={entry} />
    </div>
  );
}

function PaletteChip({
  entry,
  dragging,
}: {
  entry: PaletteEntry;
  dragging?: boolean;
}) {
  const Icon = entry.icon;
  return (
    <div
      className={cn(
        "flex cursor-grab items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-sm transition hover:border-primary",
        dragging && "shadow-md",
      )}
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      {entry.label}
    </div>
  );
}

interface CanvasProps {
  schema: FormSchema;
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
  onSetRowColumns: (rowId: string, columns: 1 | 2) => void;
  onDeleteRow: (rowId: string) => void;
}

function Canvas(props: CanvasProps) {
  const { schema } = props;
  return (
    <section className="min-h-[300px] space-y-3 rounded-2xl border border-dashed border-border bg-muted/20 p-4">
      <SortableContext
        items={schema.rows.map((r) => `row:${r.id}`)}
        strategy={verticalListSortingStrategy}
      >
        {schema.rows.map((row) => (
          <RowCard key={row.id} row={row} {...props} />
        ))}
      </SortableContext>
      <DropZone id="canvas-end" />
    </section>
  );
}

function RowCard({
  row,
  selectedFieldId,
  onSelectField,
  onDeleteField,
  onSetRowColumns,
  onDeleteRow,
}: CanvasProps & { row: FormRow }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: `row:${row.id}` });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl border border-border bg-card p-3 shadow-sm"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          className="flex cursor-grab items-center gap-1 text-xs text-muted-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-3.5 w-3.5" />
          Row
        </button>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="1 column"
            className={cn(
              "rounded p-1 text-muted-foreground hover:bg-muted",
              row.columns === 1 && "bg-muted text-foreground",
            )}
            onClick={() => onSetRowColumns(row.id, 1)}
          >
            <Square className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="2 columns"
            className={cn(
              "rounded p-1 text-muted-foreground hover:bg-muted",
              row.columns === 2 && "bg-muted text-foreground",
            )}
            onClick={() => onSetRowColumns(row.id, 2)}
          >
            <Columns className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            title="Delete row"
            className="rounded p-1 text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
            onClick={() => onDeleteRow(row.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <DropZone id={`row:${row.id}`} compact>
        <div
          className={cn(
            "grid gap-2",
            row.columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
          )}
        >
          {row.fields.map((field) => (
            <FieldCard
              key={field.id}
              field={field}
              selected={field.id === selectedFieldId}
              onSelect={() => onSelectField(field.id)}
              onDelete={() => onDeleteField(field.id)}
            />
          ))}
          {row.columns === 2 && row.fields.length < 2 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center text-xs text-muted-foreground">
              Drop a field here
            </div>
          ) : null}
        </div>
      </DropZone>
    </div>
  );
}

function FieldCard({
  field,
  selected,
  onSelect,
  onDelete,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group w-full rounded-lg border bg-background p-3 text-left transition",
        selected
          ? "border-primary ring-1 ring-primary"
          : "border-border hover:border-primary/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">
            {field.label || "(unlabeled field)"}
            {field.required ? <span className="text-rose-600"> *</span> : null}
          </p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            {FIELD_TYPE_LABELS[field.type]} · {field.key}
          </p>
        </div>
        <span
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          role="button"
          className="rounded p-1 opacity-0 transition group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      </div>
    </button>
  );
}

function DropZone({
  id,
  children,
  compact,
}: {
  id: string;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        compact
          ? ""
          : "rounded-lg border border-dashed border-border bg-background/50 p-4 text-center text-xs text-muted-foreground",
        isOver && "border-primary bg-primary/5 text-primary",
      )}
    >
      {children ?? (
        <span className="flex items-center justify-center gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Drop fields here to add a new row
        </span>
      )}
    </div>
  );
}

function Properties({
  field,
  settings,
  onChangeField,
  onChangeSettings,
}: {
  field: FormField | null;
  settings: FormSettings;
  onChangeField: (patch: Partial<FormField>) => void;
  onChangeSettings: (patch: Partial<FormSettings>) => void;
}) {
  if (!field) {
    return (
      <aside className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Form settings
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="submit-label">Submit button label</Label>
          <Input
            id="submit-label"
            value={settings.submitLabel ?? ""}
            placeholder="Send inquiry"
            onChange={(e) => onChangeSettings({ submitLabel: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="success-msg">Success message</Label>
          <Textarea
            id="success-msg"
            rows={3}
            value={settings.successMessage ?? ""}
            onChange={(e) =>
              onChangeSettings({ successMessage: e.target.value })
            }
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="redirect-url">Redirect URL after submit</Label>
          <Input
            id="redirect-url"
            value={settings.redirectUrl ?? ""}
            placeholder="https://eatatditch.com/thanks"
            onChange={(e) => onChangeSettings({ redirectUrl: e.target.value })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Select a field on the canvas to edit it.
        </p>
      </aside>
    );
  }

  const hasOptions =
    field.type === "select" ||
    field.type === "radio" ||
    field.type === "checkbox_group";

  return (
    <aside className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
        Field properties
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="field-label">Label</Label>
        <Input
          id="field-label"
          value={field.label}
          onChange={(e) => onChangeField({ label: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="field-key">Field key</Label>
        <Input
          id="field-key"
          value={field.key}
          onChange={(e) =>
            onChangeField({
              key: e.target.value.replace(/[^a-zA-Z0-9_]+/g, "_"),
            })
          }
        />
        <p className="text-[10px] text-muted-foreground">
          Used in the submission payload. Lowercase + underscores.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="field-placeholder">Placeholder</Label>
        <Input
          id="field-placeholder"
          value={field.placeholder ?? ""}
          onChange={(e) => onChangeField({ placeholder: e.target.value })}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="field-help">Help text</Label>
        <Input
          id="field-help"
          value={field.helpText ?? ""}
          onChange={(e) => onChangeField({ helpText: e.target.value })}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={field.required}
          onChange={(e) => onChangeField({ required: e.target.checked })}
        />
        Required
      </label>

      {hasOptions ? (
        <OptionsEditor field={field} onChange={onChangeField} />
      ) : null}

      <div className="space-y-1.5">
        <Label htmlFor="map-contact">Map to contact field</Label>
        <select
          id="map-contact"
          value={field.contactField ?? ""}
          onChange={(e) =>
            onChangeField({
              contactField: (e.target.value || null) as
                | FormField["contactField"]
                | null,
            })
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {(Object.keys(CONTACT_FIELD_LABELS) as Array<keyof typeof CONTACT_FIELD_LABELS>).map(
            (k) => (
              <option key={k} value={k}>
                {CONTACT_FIELD_LABELS[k]}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="map-lead">Map to lead field</Label>
        <select
          id="map-lead"
          value={field.leadField ?? ""}
          onChange={(e) =>
            onChangeField({
              leadField: (e.target.value || null) as
                | FormField["leadField"]
                | null,
            })
          }
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="">— None —</option>
          {(Object.keys(LEAD_FIELD_LABELS) as Array<keyof typeof LEAD_FIELD_LABELS>).map(
            (k) => (
              <option key={k} value={k}>
                {LEAD_FIELD_LABELS[k]}
              </option>
            ),
          )}
        </select>
      </div>
    </aside>
  );
}

function OptionsEditor({
  field,
  onChange,
}: {
  field: FormField;
  onChange: (patch: Partial<FormField>) => void;
}) {
  const options = field.options ?? [];
  return (
    <div className="space-y-1.5">
      <Label>Options</Label>
      <div className="space-y-1.5">
        {options.map((opt, idx) => (
          <div key={idx} className="flex gap-1.5">
            <Input
              value={opt.label}
              placeholder="Label"
              onChange={(e) => {
                const next = [...options];
                next[idx] = {
                  ...next[idx],
                  label: e.target.value,
                  value:
                    next[idx].value ||
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, "_")
                      .slice(0, 32),
                };
                onChange({ options: next });
              }}
            />
            <button
              type="button"
              className="rounded p-2 text-muted-foreground hover:text-rose-600"
              onClick={() =>
                onChange({ options: options.filter((_, i) => i !== idx) })
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() =>
          onChange({ options: [...options, { label: "", value: "" }] })
        }
      >
        <Plus className="h-3.5 w-3.5" />
        Add option
      </Button>
    </div>
  );
}

function createField(type: FormField["type"]): FormField {
  const base: FormField = {
    id: cryptoId(),
    type,
    label: FIELD_TYPE_LABELS[type],
    key: `field_${Math.random().toString(36).slice(2, 7)}`,
    required: false,
  };
  if (
    type === "select" ||
    type === "radio" ||
    type === "checkbox_group"
  ) {
    base.options = [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ];
  }
  return base;
}

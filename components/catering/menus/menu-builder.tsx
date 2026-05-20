"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ChevronDown,
  ChevronUp,
  Layers,
  Pencil,
  Plus,
  Sliders,
  Trash2,
  X,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createItem,
  createModifier,
  createModifierOption,
  createSection,
  createSubsection,
  deleteItem,
  deleteModifier,
  deleteModifierOption,
  deleteSection,
  deleteSubsection,
  moveItem,
  moveSection,
  updateItem,
  updateModifier,
  updateModifierOption,
  updateSection,
  updateSubsection,
} from "@/components/catering/menus/actions";
import {
  formatCents,
  MENU_ITEM_UNITS,
  MODIFIER_SELECTION_LABELS,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type {
  FullMenu,
  MenuItemWithModifiers,
  ModifierWithOptions,
  SectionWithChildren,
} from "@/lib/server/catering-menus";

export function MenuBuilder({ menu }: { menu: FullMenu }) {
  return (
    <div className="space-y-4">
      {menu.sections.map((section, i) => (
        <SectionBlock
          key={section.id}
          section={section}
          canMoveUp={i > 0}
          canMoveDown={i < menu.sections.length - 1}
        />
      ))}
      <NewSectionForm menuId={menu.id} />
    </div>
  );
}

// =============================================================================
// Section
// =============================================================================
function SectionBlock({
  section,
  canMoveUp,
  canMoveDown,
}: {
  section: SectionWithChildren;
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(section.name);
  const [description, setDescription] = useState(section.description ?? "");
  const [managingSubs, setManagingSubs] = useState(false);

  function save() {
    startTransition(async () => {
      await updateSection({
        id: section.id,
        name: name.trim() || section.name,
        description,
      });
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (
      !confirm(
        `Delete section "${section.name}" and all of its items? This cannot be undone.`,
      )
    )
      return;
    startTransition(async () => {
      await deleteSection(section.id);
      router.refresh();
    });
  }

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveSection(section.id, direction);
      router.refresh();
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3">
        {editing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              placeholder="Section name"
            />
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={pending}
              placeholder="Optional description"
              rows={2}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={save}
                disabled={pending || !name.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(section.name);
                  setDescription(section.description ?? "");
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold leading-tight">
              {section.name}
            </h3>
            {section.description ? (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {section.description}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {section.items.length} item
              {section.items.length === 1 ? "" : "s"}
              {section.subsections.length > 0
                ? ` · ${section.subsections.length} subgroup${section.subsections.length === 1 ? "" : "s"}`
                : ""}
            </p>
          </div>
        )}
        {!editing ? (
          <div className="flex items-center gap-1">
            <IconButton
              icon={ChevronUp}
              label="Move up"
              disabled={!canMoveUp || pending}
              onClick={() => move("up")}
            />
            <IconButton
              icon={ChevronDown}
              label="Move down"
              disabled={!canMoveDown || pending}
              onClick={() => move("down")}
            />
            <IconButton
              icon={Layers}
              label="Manage subgroups"
              onClick={() => setManagingSubs((m) => !m)}
              active={managingSubs}
            />
            <IconButton
              icon={Pencil}
              label="Edit section"
              onClick={() => setEditing(true)}
              disabled={pending}
            />
            <IconButton
              icon={Trash2}
              label="Delete section"
              onClick={remove}
              disabled={pending}
              tone="danger"
            />
          </div>
        ) : null}
      </header>

      {managingSubs ? (
        <SubsectionManager
          section={section}
          onClose={() => setManagingSubs(false)}
        />
      ) : null}

      <div className="divide-y divide-border">
        {section.items.map((item, i) => (
          <ItemBlock
            key={item.id}
            item={item}
            subsections={section.subsections}
            canMoveUp={i > 0}
            canMoveDown={i < section.items.length - 1}
          />
        ))}
      </div>

      <NewItemForm
        sectionId={section.id}
        subsections={section.subsections}
      />
    </section>
  );
}

// =============================================================================
// New section form
// =============================================================================
function NewSectionForm({ menuId }: { menuId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createSection({ menuId, name: name.trim() });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        className="w-full gap-1.5"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-4 w-4" />
        Add section
      </Button>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-border bg-card/60 p-4">
      <Label htmlFor="new-section-name">New section name</Label>
      <Input
        id="new-section-name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Hors d'Oeuvres, Mains, Desserts…"
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
      />
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Adding…" : "Add"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setName("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Subsection manager
// =============================================================================
function SubsectionManager({
  section,
  onClose,
}: {
  section: SectionWithChildren;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");

  function add() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createSubsection({
        sectionId: section.id,
        name: name.trim(),
      });
      setName("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Remove this subgroup? Items will be detached but kept."))
      return;
    startTransition(async () => {
      await deleteSubsection(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2 border-b border-border bg-muted/20 px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Subgroups
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Done
        </button>
      </div>
      {section.subsections.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Subgroups are optional buckets under a section (e.g. Cold / Hot).
        </p>
      ) : (
        <ul className="flex flex-wrap items-center gap-1.5">
          {section.subsections.map((s) => (
            <li
              key={s.id}
              className="inline-flex items-center gap-1 rounded-full bg-card px-2.5 py-1 text-xs"
            >
              <SubsectionPill subsection={s} />
              <button
                type="button"
                onClick={() => remove(s.id)}
                disabled={pending}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Remove ${s.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New subgroup name"
          disabled={pending}
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === "Enter") add();
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={add}
          disabled={pending || !name.trim()}
        >
          Add
        </Button>
      </div>
    </div>
  );
}

function SubsectionPill({
  subsection,
}: {
  subsection: SectionWithChildren["subsections"][number];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(subsection.name);
  const [pending, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateSubsection(subsection.id, { name: name.trim() });
      setEditing(false);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <input
        value={name}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        disabled={pending}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setName(subsection.name);
          }
        }}
        className="border-b border-foreground bg-transparent text-xs focus:outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className="font-medium hover:underline"
    >
      {subsection.name}
    </button>
  );
}

// =============================================================================
// Item
// =============================================================================
function ItemBlock({
  item,
  subsections,
  canMoveUp,
  canMoveDown,
}: {
  item: MenuItemWithModifiers;
  subsections: SectionWithChildren["subsections"];
  canMoveUp: boolean;
  canMoveDown: boolean;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [pending, startTransition] = useTransition();

  function move(direction: "up" | "down") {
    startTransition(async () => {
      await moveItem(item.id, direction);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteItem(item.id);
      router.refresh();
    });
  }

  const subName = subsections.find((s) => s.id === item.subsection_id)?.name;
  const allergenLine =
    item.allergens.length > 0 ? item.allergens.join(", ") : null;

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <p className="font-medium">{item.name}</p>
            <span className="text-sm tabular-nums text-muted-foreground">
              {formatCents(item.price_cents)} / {item.unit}
            </span>
            {subName ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {subName}
              </span>
            ) : null}
            {!item.is_available ? (
              <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-rose-900">
                Hidden
              </span>
            ) : null}
          </div>
          {item.description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {item.description}
            </p>
          ) : null}
          {allergenLine ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Allergens: {allergenLine}
            </p>
          ) : null}
          {item.modifiers.length > 0 ? (
            <p className="mt-1 text-xs text-muted-foreground">
              <Sliders className="mr-1 inline h-3 w-3" />
              {item.modifiers.length} modifier group
              {item.modifiers.length === 1 ? "" : "s"}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-1">
          <IconButton
            icon={ChevronUp}
            label="Move up"
            disabled={!canMoveUp || pending}
            onClick={() => move("up")}
          />
          <IconButton
            icon={ChevronDown}
            label="Move down"
            disabled={!canMoveDown || pending}
            onClick={() => move("down")}
          />
          <IconButton
            icon={Pencil}
            label={expanded ? "Close editor" : "Edit"}
            onClick={() => setExpanded((x) => !x)}
            active={expanded}
            disabled={pending}
          />
          <IconButton
            icon={Trash2}
            label="Delete"
            tone="danger"
            onClick={remove}
            disabled={pending}
          />
        </div>
      </div>

      {expanded ? (
        <ItemEditor
          item={item}
          subsections={subsections}
          onSaved={() => setExpanded(false)}
        />
      ) : null}
    </div>
  );
}

// =============================================================================
// Item editor (inline expanded form + modifiers list)
// =============================================================================
function ItemEditor({
  item,
  subsections,
  onSaved,
}: {
  item: MenuItemWithModifiers;
  subsections: SectionWithChildren["subsections"];
  onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(item.name);
  const [description, setDescription] = useState(item.description ?? "");
  const [unit, setUnit] = useState(item.unit);
  const [price, setPrice] = useState((item.price_cents / 100).toFixed(2));
  const [subsectionId, setSubsectionId] = useState<string>(
    item.subsection_id ?? "",
  );
  const [allergens, setAllergens] = useState(item.allergens.join(", "));
  const [available, setAvailable] = useState(item.is_available);
  const [imageUrl, setImageUrl] = useState(item.image_url ?? "");
  const [minQty, setMinQty] = useState(
    item.min_quantity != null ? String(item.min_quantity) : "",
  );

  function save() {
    setError(null);
    if (!name.trim()) {
      setError("Name required");
      return;
    }
    startTransition(async () => {
      const res = await updateItem({
        id: item.id,
        sectionId: item.section_id,
        subsectionId: subsectionId || null,
        name: name.trim(),
        description: description || null,
        unit: unit || "each",
        price: Number.parseFloat(price) || 0,
        minQuantity: minQty ? Number.parseFloat(minQty) : null,
        allergens: allergens
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean),
        imageUrl: imageUrl || null,
        isAvailable: available,
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
    <div className="mt-3 space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Description</Label>
          <Textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={pending}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Unit</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            list="menu-units"
            placeholder="each / per person / per dozen"
            disabled={pending}
          />
          <datalist id="menu-units">
            {MENU_ITEM_UNITS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </div>
        <div className="space-y-1.5">
          <Label>Price ($)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Minimum quantity</Label>
          <Input
            type="number"
            min="0"
            step="0.5"
            inputMode="decimal"
            value={minQty}
            onChange={(e) => setMinQty(e.target.value)}
            placeholder="Optional"
            disabled={pending}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Subgroup</Label>
          <select
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={subsectionId}
            onChange={(e) => setSubsectionId(e.target.value)}
            disabled={pending}
          >
            <option value="">— None —</option>
            {subsections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Allergens</Label>
          <Input
            value={allergens}
            onChange={(e) => setAllergens(e.target.value)}
            placeholder="dairy, gluten, peanut, shellfish"
            disabled={pending}
          />
          <p className="text-[11px] text-muted-foreground">
            Comma-separated.
          </p>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Image URL</Label>
          <Input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://… (optional)"
            disabled={pending}
          />
        </div>
        <label className="flex items-center gap-2 sm:col-span-2 text-sm">
          <input
            type="checkbox"
            checked={available}
            onChange={(e) => setAvailable(e.target.checked)}
            disabled={pending}
          />
          Available — uncheck to hide on quotes/menus without deleting.
        </label>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onSaved}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={save}
          disabled={pending || !name.trim()}
        >
          {pending ? "Saving…" : "Save item"}
        </Button>
      </div>

      <ModifierList itemId={item.id} modifiers={item.modifiers} />
    </div>
  );
}

// =============================================================================
// Modifier groups + options
// =============================================================================
function ModifierList({
  itemId,
  modifiers,
}: {
  itemId: string;
  modifiers: ModifierWithOptions[];
}) {
  return (
    <div className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Modifier groups</h4>
      </div>
      {modifiers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No modifier groups yet. Add one to offer choices (protein, sides,
          add-ons).
        </p>
      ) : (
        <div className="space-y-3">
          {modifiers.map((m) => (
            <ModifierBlock key={m.id} modifier={m} />
          ))}
        </div>
      )}
      <NewModifierForm itemId={itemId} />
    </div>
  );
}

function ModifierBlock({ modifier }: { modifier: ModifierWithOptions }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(modifier.name);
  const [selectionKind, setSelectionKind] = useState(modifier.selection_kind);
  const [required, setRequired] = useState(modifier.required);
  const [minSelect, setMinSelect] = useState(String(modifier.min_select));
  const [maxSelect, setMaxSelect] = useState(
    modifier.max_select != null ? String(modifier.max_select) : "",
  );

  function save() {
    startTransition(async () => {
      await updateModifier({
        id: modifier.id,
        itemId: modifier.item_id,
        name: name.trim() || modifier.name,
        selectionKind,
        required,
        minSelect: Number.parseInt(minSelect, 10) || 0,
        maxSelect: maxSelect ? Number.parseInt(maxSelect, 10) : null,
      });
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete modifier group "${modifier.name}"?`)) return;
    startTransition(async () => {
      await deleteModifier(modifier.id);
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        {editing ? (
          <div className="flex-1 space-y-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              placeholder="Group name"
            />
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <select
                className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
                value={selectionKind}
                onChange={(e) =>
                  setSelectionKind(e.target.value as typeof selectionKind)
                }
                disabled={pending}
              >
                {(Object.keys(MODIFIER_SELECTION_LABELS) as Array<
                  keyof typeof MODIFIER_SELECTION_LABELS
                >).map((k) => (
                  <option key={k} value={k}>
                    {MODIFIER_SELECTION_LABELS[k]}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  disabled={pending}
                />
                Required
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs">
                Min
                <input
                  type="number"
                  min="0"
                  className="h-7 w-16 rounded-lg border border-input bg-background px-2 text-sm"
                  value={minSelect}
                  onChange={(e) => setMinSelect(e.target.value)}
                  disabled={pending}
                />
              </label>
              <label className="inline-flex items-center gap-1.5 text-xs">
                Max
                <input
                  type="number"
                  min="1"
                  className="h-7 w-16 rounded-lg border border-input bg-background px-2 text-sm"
                  value={maxSelect}
                  onChange={(e) => setMaxSelect(e.target.value)}
                  placeholder="∞"
                  disabled={pending}
                />
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="accent"
                onClick={save}
                disabled={pending || !name.trim()}
              >
                Save
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setEditing(false);
                  setName(modifier.name);
                  setSelectionKind(modifier.selection_kind);
                  setRequired(modifier.required);
                  setMinSelect(String(modifier.min_select));
                  setMaxSelect(
                    modifier.max_select != null
                      ? String(modifier.max_select)
                      : "",
                  );
                }}
                disabled={pending}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{modifier.name}</p>
            <p className="text-xs text-muted-foreground">
              {MODIFIER_SELECTION_LABELS[modifier.selection_kind]}
              {modifier.required ? " · required" : ""}
              {modifier.selection_kind === "multi"
                ? ` · min ${modifier.min_select}, max ${modifier.max_select ?? "∞"}`
                : ""}
            </p>
          </div>
        )}
        {!editing ? (
          <div className="flex items-center gap-1">
            <IconButton
              icon={Pencil}
              label="Edit"
              onClick={() => setEditing(true)}
              disabled={pending}
            />
            <IconButton
              icon={Trash2}
              label="Delete"
              tone="danger"
              onClick={remove}
              disabled={pending}
            />
          </div>
        ) : null}
      </div>

      <ul className="mt-2 space-y-1">
        {modifier.options.map((o) => (
          <OptionRow key={o.id} option={o} />
        ))}
      </ul>
      <NewOptionForm modifierId={modifier.id} />
    </div>
  );
}

function OptionRow({
  option,
}: {
  option: ModifierWithOptions["options"][number];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(option.name);
  const [priceDelta, setPriceDelta] = useState(
    (option.price_delta_cents / 100).toFixed(2),
  );
  const [isDefault, setIsDefault] = useState(option.is_default);

  function save() {
    startTransition(async () => {
      await updateModifierOption({
        id: option.id,
        modifierId: option.modifier_id,
        name: name.trim() || option.name,
        priceDelta: Number.parseFloat(priceDelta) || 0,
        isDefault,
      });
      setEditing(false);
      router.refresh();
    });
  }

  function remove() {
    if (!confirm(`Delete option "${option.name}"?`)) return;
    startTransition(async () => {
      await deleteModifierOption(option.id);
      router.refresh();
    });
  }

  if (editing) {
    return (
      <li className="flex flex-wrap items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-8 flex-1 min-w-[12rem]"
          disabled={pending}
        />
        <Input
          type="number"
          step="0.01"
          value={priceDelta}
          onChange={(e) => setPriceDelta(e.target.value)}
          className="h-8 w-24"
          disabled={pending}
        />
        <label className="inline-flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            disabled={pending}
          />
          Default
        </label>
        <Button size="sm" variant="accent" onClick={save} disabled={pending}>
          Save
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditing(false)}
          disabled={pending}
        >
          Cancel
        </Button>
      </li>
    );
  }

  const delta = option.price_delta_cents / 100;
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 px-2 py-1 text-sm">
      <span className="inline-flex items-center gap-2">
        <span>{option.name}</span>
        {option.is_default ? (
          <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent">
            Default
          </span>
        ) : null}
        <span className="tabular-nums text-muted-foreground">
          {delta === 0
            ? "—"
            : `${delta > 0 ? "+" : "−"}$${Math.abs(delta).toFixed(2)}`}
        </span>
      </span>
      <span className="flex items-center gap-1">
        <IconButton
          icon={Pencil}
          label="Edit"
          onClick={() => setEditing(true)}
        />
        <IconButton
          icon={Trash2}
          label="Delete"
          tone="danger"
          onClick={remove}
        />
      </span>
    </li>
  );
}

function NewModifierForm({ itemId }: { itemId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createModifier({
        itemId,
        name: name.trim(),
        selectionKind: "single",
      });
      setName("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => setOpen(true)}
      >
        <Plus className="h-3 w-3" />
        Add modifier group
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Choice of protein"
        disabled={pending}
        className="h-8 flex-1 min-w-[14rem]"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setOpen(false);
            setName("");
          }
        }}
      />
      <Button
        size="sm"
        variant="accent"
        onClick={submit}
        disabled={pending || !name.trim()}
      >
        Add
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setOpen(false);
          setName("");
        }}
        disabled={pending}
      >
        Cancel
      </Button>
    </div>
  );
}

function NewOptionForm({ modifierId }: { modifierId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [priceDelta, setPriceDelta] = useState("0");
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!name.trim()) return;
    startTransition(async () => {
      await createModifierOption({
        modifierId,
        name: name.trim(),
        priceDelta: Number.parseFloat(priceDelta) || 0,
      });
      setName("");
      setPriceDelta("0");
      router.refresh();
    });
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-2">
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Add option"
        disabled={pending}
        className="h-8 flex-1 min-w-[12rem]"
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <Input
        type="number"
        step="0.01"
        value={priceDelta}
        onChange={(e) => setPriceDelta(e.target.value)}
        className="h-8 w-24"
        placeholder="$0.00"
        disabled={pending}
      />
      <Button
        size="sm"
        variant="outline"
        onClick={submit}
        disabled={pending || !name.trim()}
      >
        Add
      </Button>
    </div>
  );
}

// =============================================================================
// New item form (collapsed pill that expands to a form)
// =============================================================================
function NewItemForm({
  sectionId,
  subsections,
}: {
  sectionId: string;
  subsections: SectionWithChildren["subsections"];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0.00");
  const [unit, setUnit] = useState("each");
  const [subsectionId, setSubsectionId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const res = await createItem({
        sectionId,
        subsectionId: subsectionId || null,
        name: name.trim(),
        unit: unit || "each",
        price: Number.parseFloat(price) || 0,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setName("");
      setPrice("0.00");
      setUnit("each");
      setSubsectionId("");
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="border-t border-border bg-muted/10 px-4 py-3">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add item
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t border-border bg-muted/10 px-4 py-3">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
        <Input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Item name"
          disabled={pending}
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="$"
          className="w-28"
          disabled={pending}
        />
        <Input
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
          list="menu-units"
          placeholder="unit"
          className="w-32"
          disabled={pending}
        />
        {subsections.length > 0 ? (
          <select
            className="flex h-10 rounded-lg border border-input bg-background px-3 text-sm"
            value={subsectionId}
            onChange={(e) => setSubsectionId(e.target.value)}
            disabled={pending}
          >
            <option value="">No subgroup</option>
            {subsections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="accent"
          onClick={submit}
          disabled={pending || !name.trim()}
        >
          {pending ? "Adding…" : "Add item"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false);
            setName("");
            setPrice("0.00");
            setUnit("each");
            setSubsectionId("");
          }}
          disabled={pending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// Tiny icon button helper
// =============================================================================
function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  active,
  tone = "default",
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  tone?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors",
        "hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-muted text-foreground",
        tone === "danger" && "hover:bg-rose-100 hover:text-rose-700",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

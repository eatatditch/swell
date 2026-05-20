"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Utensils } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/data/empty-state";
import {
  deleteMenuItem,
  upsertMenuItem,
} from "@/components/catering/menu/actions";
import {
  centsToDollarString,
  formatCents,
  MENU_CATEGORIES,
  MENU_CATEGORY_LABELS,
} from "@/lib/constants/catering";
import type { EventMenuCategory, EventMenuItem } from "@/lib/types/database";

interface MenuEditorProps {
  eventId: string;
  items: EventMenuItem[];
}

export function MenuEditor({ eventId, items }: MenuEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const total = items.reduce((acc, i) => acc + i.total_cents, 0);

  function remove(id: string) {
    if (!confirm("Remove this line item?")) return;
    startTransition(async () => {
      await deleteMenuItem(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? "line" : "lines"}
        </p>
        <MenuItemDialog
          eventId={eventId}
          nextPosition={(items[items.length - 1]?.position ?? 0) + 10}
          trigger={
            <Button variant="accent" size="sm" className="gap-1.5">
              <Plus className="h-4 w-4" />
              Add line
            </Button>
          }
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No menu items yet"
          description="Add courses, beverages, rentals, and services."
        />
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Unit</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((it) => (
                <tr key={it.id} className="align-top">
                  <td className="px-3 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                    {MENU_CATEGORY_LABELS[it.category]}
                  </td>
                  <td className="px-3 py-2">
                    <p className="font-medium">{it.name}</p>
                    {it.description ? (
                      <p className="text-xs text-muted-foreground">
                        {it.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {formatCents(it.unit_price_cents)}
                  </td>
                  <td className="px-3 py-2 text-right font-medium tabular-nums">
                    {formatCents(it.total_cents)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <MenuItemDialog
                        eventId={eventId}
                        item={it}
                        trigger={
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(it.id)}
                        disabled={pending}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <td colSpan={4} className="px-3 py-2 text-right text-xs uppercase tracking-wide text-muted-foreground">
                  Subtotal
                </td>
                <td className="px-3 py-2 text-right text-base font-semibold tabular-nums">
                  {formatCents(total)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function MenuItemDialog({
  eventId,
  item,
  nextPosition,
  trigger,
}: {
  eventId: string;
  item?: EventMenuItem;
  nextPosition?: number;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState<EventMenuCategory>(
    item?.category ?? "food",
  );
  const [name, setName] = useState(item?.name ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [quantity, setQuantity] = useState(
    item?.quantity != null ? String(item.quantity) : "1",
  );
  const [unitPrice, setUnitPrice] = useState(
    centsToDollarString(item?.unit_price_cents ?? null),
  );

  function submit() {
    setError(null);
    const qty = Number.parseFloat(quantity);
    const unit = Number.parseFloat(unitPrice);
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!Number.isFinite(qty) || qty < 0) {
      setError("Quantity is invalid");
      return;
    }
    if (!Number.isFinite(unit) || unit < 0) {
      setError("Unit price is invalid");
      return;
    }
    startTransition(async () => {
      const res = await upsertMenuItem({
        id: item?.id,
        eventId,
        position: item?.position ?? nextPosition ?? 10,
        category,
        name: name.trim(),
        description: description || null,
        quantity: qty,
        unitPrice: unit,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      if (!item) {
        setName("");
        setDescription("");
        setQuantity("1");
        setUnitPrice("");
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? "Edit line item" : "Add line item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="mi-cat">Category</Label>
            <select
              id="mi-cat"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as EventMenuCategory)}
              disabled={pending}
            >
              {MENU_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {MENU_CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="mi-name">Name</Label>
            <Input
              id="mi-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Crispy Brussels…"
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mi-desc">Description</Label>
            <Textarea
              id="mi-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pancetta, lemon, parmesan"
              disabled={pending}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mi-qty">Quantity</Label>
              <Input
                id="mi-qty"
                type="number"
                min="0"
                step="0.25"
                inputMode="decimal"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mi-unit">Unit price ($)</Label>
              <Input
                id="mi-unit"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="0.00"
                disabled={pending}
              />
            </div>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="accent"
            onClick={submit}
            disabled={pending || !name.trim()}
          >
            {pending ? "Saving…" : item ? "Save" : "Add line"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

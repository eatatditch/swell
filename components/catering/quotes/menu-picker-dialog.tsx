"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCents } from "@/lib/constants/catering";
import type {
  FullMenu,
  MenuItemWithModifiers,
} from "@/lib/server/catering-menus";

interface MenuPickerDialogProps {
  menus: FullMenu[];
  trigger: React.ReactNode;
  onConfirm: (
    items: Array<{ menuItemId: string; quantity: number }>,
  ) => Promise<{ ok?: boolean; error?: string }>;
}

interface PickedRow {
  itemId: string;
  quantity: number;
}

export function MenuPickerDialog({
  menus,
  trigger,
  onConfirm,
}: MenuPickerDialogProps) {
  const [open, setOpen] = useState(false);
  const [menuId, setMenuId] = useState<string>(menus[0]?.id ?? "");
  const [picked, setPicked] = useState<PickedRow[]>([]);
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const currentMenu = useMemo(
    () => menus.find((m) => m.id === menuId),
    [menus, menuId],
  );

  const allItems: MenuItemWithModifiers[] = useMemo(
    () =>
      currentMenu?.sections.flatMap((s) =>
        s.items.map((it) => ({ ...it })),
      ) ?? [],
    [currentMenu],
  );

  const filteredSections = useMemo(() => {
    if (!currentMenu) return [];
    const q = search.trim().toLowerCase();
    return currentMenu.sections.map((s) => ({
      ...s,
      items: q
        ? s.items.filter(
            (it) =>
              it.name.toLowerCase().includes(q) ||
              (it.description ?? "").toLowerCase().includes(q),
          )
        : s.items,
    }));
  }, [currentMenu, search]);

  function toggle(item: MenuItemWithModifiers) {
    setPicked((prev) => {
      const existing = prev.find((p) => p.itemId === item.id);
      if (existing) return prev.filter((p) => p.itemId !== item.id);
      return [
        ...prev,
        {
          itemId: item.id,
          quantity: item.min_quantity ?? 1,
        },
      ];
    });
  }

  function setQty(itemId: string, quantity: number) {
    setPicked((prev) =>
      prev.map((p) =>
        p.itemId === itemId
          ? { ...p, quantity: Math.max(0, quantity) }
          : p,
      ),
    );
  }

  function submit() {
    setError(null);
    if (picked.length === 0) {
      setError("Pick at least one item");
      return;
    }
    startTransition(async () => {
      const res = await onConfirm(
        picked.map((p) => ({ menuItemId: p.itemId, quantity: p.quantity })),
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setPicked([]);
      setSearch("");
    });
  }

  if (menus.length === 0) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="contents"
        >
          {trigger}
        </button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>No menus available</DialogTitle>
            <DialogDescription>
              Build a menu in the library before pulling items into a quote.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="contents"
      >
        {trigger}
      </button>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add from menu library</DialogTitle>
          <DialogDescription>
            Pick a menu, then check the items to copy in.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <select
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={menuId}
            onChange={(e) => setMenuId(e.target.value)}
          >
            {menus.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            className="w-full sm:w-56"
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-border">
          {filteredSections.map((section) => (
            <div key={section.id}>
              {section.items.length === 0 ? null : (
                <>
                  <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {section.name}
                  </div>
                  <ul className="divide-y divide-border">
                    {section.items.map((item) => {
                      const pick = picked.find((p) => p.itemId === item.id);
                      return (
                        <li
                          key={item.id}
                          className="flex items-center gap-3 px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={!!pick}
                            onChange={() => toggle(item)}
                            className="h-4 w-4"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCents(item.price_cents)} / {item.unit}
                              {item.description ? ` · ${item.description}` : ""}
                            </p>
                          </div>
                          {pick ? (
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={pick.quantity}
                              onChange={(e) =>
                                setQty(
                                  item.id,
                                  Number.parseFloat(e.target.value) || 0,
                                )
                              }
                              className="h-8 w-20"
                            />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </>
              )}
            </div>
          ))}
          {allItems.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">
              This menu has no items yet.
            </p>
          ) : null}
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

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
            disabled={pending || picked.length === 0}
          >
            {pending
              ? "Adding…"
              : `Add ${picked.length} item${picked.length === 1 ? "" : "s"}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

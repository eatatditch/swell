"use client";

import { Check, Plus, Search, User as UserIcon, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { ContactLite } from "@/lib/server/catering";

export interface NewContactDraft {
  fullName: string;
  email: string;
  phone: string;
  company: string;
}

export type ContactPickerValue =
  | { mode: "existing"; contactId: string; contact: ContactLite }
  | { mode: "new"; draft: NewContactDraft };

interface ContactPickerProps {
  contacts: ContactLite[];
  value: ContactPickerValue | null;
  onChange: (value: ContactPickerValue | null) => void;
  disabled?: boolean;
}

export function ContactPicker({
  contacts,
  value,
  onChange,
  disabled,
}: ContactPickerProps) {
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"pick" | "new">(
    value?.mode === "new" ? "new" : "pick",
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return contacts.slice(0, 8);
    return contacts
      .filter((c) => {
        return (
          c.full_name.toLowerCase().includes(q) ||
          (c.company ?? "").toLowerCase().includes(q) ||
          (c.email ?? "").toLowerCase().includes(q) ||
          (c.phone ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 8);
  }, [contacts, query]);

  function selectExisting(c: ContactLite) {
    setQuery("");
    onChange({ mode: "existing", contactId: c.id, contact: c });
  }

  function clear() {
    onChange(null);
    setQuery("");
  }

  function startCreate() {
    setMode("new");
    onChange({
      mode: "new",
      draft: {
        fullName: query.trim(),
        email: "",
        phone: "",
        company: "",
      },
    });
  }

  function updateDraft<K extends keyof NewContactDraft>(
    key: K,
    next: NewContactDraft[K],
  ) {
    if (value?.mode !== "new") return;
    onChange({ mode: "new", draft: { ...value.draft, [key]: next } });
  }

  function backToPick() {
    setMode("pick");
    onChange(null);
  }

  // Selected existing — show a chip and a clear button.
  if (value?.mode === "existing") {
    return (
      <div className="space-y-2">
        <Label>Contact *</Label>
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate font-medium">{value.contact.full_name}</p>
            {value.contact.company ? (
              <p className="truncate text-xs text-muted-foreground">
                {value.contact.company}
              </p>
            ) : null}
            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
              {value.contact.email ? <span>{value.contact.email}</span> : null}
              {value.contact.phone ? <span>{value.contact.phone}</span> : null}
            </div>
          </div>
          <button
            type="button"
            onClick={clear}
            disabled={disabled}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Change contact"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (mode === "new" && value?.mode === "new") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>New contact</Label>
          <button
            type="button"
            onClick={backToPick}
            disabled={disabled}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Pick existing instead
          </button>
        </div>
        <div className="grid gap-3 rounded-xl border border-border bg-card p-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cp-name">Full name *</Label>
            <Input
              id="cp-name"
              value={value.draft.fullName}
              onChange={(e) => updateDraft("fullName", e.target.value)}
              placeholder="Jane Doe"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-email">Email</Label>
            <Input
              id="cp-email"
              type="email"
              value={value.draft.email}
              onChange={(e) => updateDraft("email", e.target.value)}
              placeholder="jane@example.com"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cp-phone">Phone</Label>
            <Input
              id="cp-phone"
              value={value.draft.phone}
              onChange={(e) => updateDraft("phone", e.target.value)}
              placeholder="(631) 555-0123"
              disabled={disabled}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cp-company">Company</Label>
            <Input
              id="cp-company"
              value={value.draft.company}
              onChange={(e) => updateDraft("company", e.target.value)}
              placeholder="Optional"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  // Pick mode (default) — search box + suggestion list + "create new" affordance.
  return (
    <div className="space-y-2">
      <Label htmlFor="cp-search">Contact *</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="cp-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, email, phone…"
          className="pl-9"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      <div className="rounded-xl border border-border bg-card">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">
            No matches.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => selectExisting(c)}
                  disabled={disabled}
                  className={cn(
                    "flex w-full items-start gap-3 px-3 py-2.5 text-left hover:bg-muted/40",
                  )}
                >
                  <UserIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{c.full_name}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      {c.company ? <span>{c.company}</span> : null}
                      {c.email ? <span>{c.email}</span> : null}
                      {c.phone ? <span>{c.phone}</span> : null}
                    </div>
                  </div>
                  <Check className="invisible h-4 w-4 text-accent" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <button
          type="button"
          onClick={startCreate}
          disabled={disabled}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-sm text-accent hover:bg-accent/10"
        >
          <Plus className="h-4 w-4" />
          Add new contact{query.trim() ? ` "${query.trim()}"` : ""}
        </button>
      </div>
    </div>
  );
}

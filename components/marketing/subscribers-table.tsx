"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Search, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteSubscriber,
  updateSubscriber,
} from "@/components/marketing/subscriber-actions";
import { TagInput } from "@/components/marketing/tag-input";
import type { MarketingSubscriber } from "@/lib/types/database";

interface Props {
  subscribers: MarketingSubscriber[];
  knownTags: string[];
}

export function SubscribersTable({ subscribers, knownTags }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<MarketingSubscriber | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return subscribers;
    return subscribers.filter((s) =>
      [s.name, s.email, s.phone, s.source, ...(s.tags ?? [])]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle)),
    );
  }, [subscribers, q]);

  return (
    <>
      <div className="mb-3 flex items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, email, phone, tag…"
            className="pl-8"
          />
        </div>
        <span className="text-xs text-muted-foreground">
          {filtered.length} of {subscribers.length}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Phone</th>
              <th className="px-3 py-2 font-medium">Tags</th>
              <th className="px-3 py-2 font-medium">Opt-in</th>
              <th className="px-3 py-2 font-medium">Source</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr key={s.id} className="border-t border-border align-middle">
                <td className="px-3 py-2">
                  <p className="font-medium">{s.name ?? "—"}</p>
                  {!s.is_active ? (
                    <span className="text-[10px] uppercase text-muted-foreground">
                      Inactive
                    </span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-xs">{s.email ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{s.phone ?? "—"}</td>
                <td className="px-3 py-2">
                  {s.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {s.tags.map((t) => (
                        <Badge key={t} variant="secondary" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs">
                  <div className="flex flex-col gap-0.5">
                    {s.opt_in_email && !s.opt_out_email_at ? (
                      <span className="text-emerald-700">Email ✓</span>
                    ) : (
                      <span className="text-muted-foreground">Email —</span>
                    )}
                    {s.opt_in_sms && !s.opt_out_sms_at ? (
                      <span className="text-emerald-700">SMS ✓</span>
                    ) : (
                      <span className="text-muted-foreground">SMS —</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.source ?? "—"}
                </td>
                <td className="px-3 py-2 text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditing(s)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          if (!confirm(`Delete ${s.name ?? s.email ?? s.phone}?`))
                            return;
                          await deleteSubscriber(s.id);
                          router.refresh();
                        }}
                        className="text-rose-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing ? (
        <EditDialog
          subscriber={editing}
          knownTags={knownTags}
          onClose={() => setEditing(null)}
        />
      ) : null}
    </>
  );
}

function EditDialog({
  subscriber,
  knownTags,
  onClose,
}: {
  subscriber: MarketingSubscriber;
  knownTags: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [name, setName] = useState(subscriber.name ?? "");
  const [email, setEmail] = useState(subscriber.email ?? "");
  const [phone, setPhone] = useState(subscriber.phone ?? "");
  const [tags, setTags] = useState<string[]>(subscriber.tags ?? []);
  const [source, setSource] = useState(subscriber.source ?? "");
  const [optInEmail, setOptInEmail] = useState(
    subscriber.opt_in_email && !subscriber.opt_out_email_at,
  );
  const [optInSms, setOptInSms] = useState(
    subscriber.opt_in_sms && !subscriber.opt_out_sms_at,
  );
  const [notes, setNotes] = useState(subscriber.notes ?? "");
  const [isActive, setIsActive] = useState(subscriber.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateSubscriber({
        id: subscriber.id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        tags,
        source: source || null,
        optInEmail,
        optInSms,
        notes: notes || null,
        isActive,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit subscriber</DialogTitle>
          <DialogDescription>{subscriber.email ?? subscriber.phone}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="e-name">Name</Label>
            <Input
              id="e-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e-email">Email</Label>
              <Input
                id="e-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-phone">Phone</Label>
              <Input
                id="e-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
          <TagInput value={tags} onChange={setTags} known={knownTags} />
          <div className="space-y-2">
            <Label htmlFor="e-source">Source</Label>
            <Input
              id="e-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={optInEmail}
                onChange={(e) => setOptInEmail(e.target.checked)}
                className="h-4 w-4"
              />
              Email opt-in
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={optInSms}
                onChange={(e) => setOptInSms(e.target.checked)}
                className="h-4 w-4"
              />
              SMS opt-in
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active
            </label>
          </div>
          <div className="space-y-2">
            <Label htmlFor="e-notes">Notes</Label>
            <Textarea
              id="e-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

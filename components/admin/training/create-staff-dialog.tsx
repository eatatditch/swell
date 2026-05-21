"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createTrainingStaff } from "@/components/admin/training/staff-actions";
import {
  TRAINING_STAFF_TYPE_LABELS,
  TRAINING_STAFF_TYPES,
} from "@/lib/constants/training";

interface Props {
  locations: { id: string; name: string }[];
}

export function CreateStaffDialog({ locations }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [staffType, setStaffType] = useState<string>(TRAINING_STAFF_TYPES[0]);
  const [locationId, setLocationId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [customPin, setCustomPin] = useState("");
  const [autoAssign, setAutoAssign] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ pin: string; paths: number } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();

  function reset() {
    setFullName("");
    setStaffType(TRAINING_STAFF_TYPES[0]);
    setLocationId("");
    setEmail("");
    setPhone("");
    setStartDate("");
    setCustomPin("");
    setAutoAssign(true);
    setNotes("");
    setError(null);
    setSuccess(null);
  }

  function submit() {
    setError(null);
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }
    if (customPin && !/^\d{4,6}$/.test(customPin)) {
      setError("PIN must be 4–6 digits or left blank.");
      return;
    }
    startTransition(async () => {
      const res = await createTrainingStaff({
        fullName,
        staffType,
        locationId: locationId || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        startDate: startDate || null,
        pin: customPin || undefined,
        notes: notes.trim() || null,
        autoAssignPaths: autoAssign,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSuccess({ pin: res.pin, paths: res.pathsAssigned });
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add staff
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add training staff</DialogTitle>
          <DialogDescription>
            Adds a kiosk-only account. They sign in at /learn/kiosk with the
            PIN we show on the next screen.
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-3">
            <Alert>
              <AlertDescription>
                <p className="font-medium">Staff added.</p>
                <p className="mt-1 text-sm">
                  PIN:{" "}
                  <code className="rounded bg-muted px-2 py-0.5 font-mono text-base font-semibold">
                    {success.pin}
                  </code>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(success.pin)}
                    className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Auto-assigned {success.paths} path
                  {success.paths === 1 ? "" : "s"}. Share the PIN with the
                  staff member — they&apos;ll need it to sign into the kiosk.
                </p>
              </AlertDescription>
            </Alert>
            <DialogFooter>
              <Button onClick={reset} variant="outline">
                Add another
              </Button>
              <Button onClick={() => setOpen(false)} variant="accent">
                Done
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">Full name *</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Role *</Label>
                <select
                  id="type"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={staffType}
                  onChange={(e) => setStaffType(e.target.value)}
                >
                  {TRAINING_STAFF_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {TRAINING_STAFF_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loc">Location</Label>
                <select
                  id="loc"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">— Any —</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@eatatditch.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(555) 555-5555"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="start">Start date</Label>
                <Input
                  id="start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pin">PIN (optional, auto-generated)</Label>
                <Input
                  id="pin"
                  inputMode="numeric"
                  maxLength={6}
                  value={customPin}
                  onChange={(e) =>
                    setCustomPin(e.target.value.replace(/\D/g, ""))
                  }
                  placeholder="4-6 digits"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={autoAssign}
                onChange={(e) => setAutoAssign(e.target.checked)}
                className="h-4 w-4"
              />
              Auto-assign paths targeting{" "}
              <strong>{TRAINING_STAFF_TYPE_LABELS[staffType as keyof typeof TRAINING_STAFF_TYPE_LABELS]}</strong>
            </label>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Anything worth remembering…"
              />
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button variant="accent" onClick={submit} disabled={pending}>
                {pending ? "Adding…" : "Add staff"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, KeyRound, MoreVertical, Pencil, Trash2 } from "lucide-react";

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
  TRAINING_STAFF_TYPE_LABELS,
  TRAINING_STAFF_TYPE_SHORT,
  TRAINING_STAFF_TYPES,
} from "@/lib/constants/training";
import type { TrainingStaff } from "@/lib/types/database";
import {
  deleteTrainingStaff,
  resetStaffPin,
  updateTrainingStaff,
} from "@/components/admin/training/staff-actions";

type StaffRow = TrainingStaff & { location_name: string | null };

interface Props {
  staff: StaffRow[];
  locations: { id: string; name: string }[];
}

export function StaffRosterTable({ staff, locations }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState<StaffRow | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPin, setNewPin] = useState<string | null>(null);

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Location</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Last seen</th>
              <th className="px-3 py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr
                key={s.id}
                className="border-t border-border align-middle"
              >
                <td className="px-3 py-2">
                  <p className="font-medium">{s.full_name}</p>
                  {s.email ? (
                    <p className="text-xs text-muted-foreground">{s.email}</p>
                  ) : null}
                </td>
                <td className="px-3 py-2">
                  <Badge variant="secondary">
                    {TRAINING_STAFF_TYPE_SHORT[s.staff_type]}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.location_name ?? "—"}
                </td>
                <td className="px-3 py-2">
                  {s.is_active ? (
                    <span className="text-xs font-medium text-primary">
                      Active
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {s.last_seen_at
                    ? new Date(s.last_seen_at).toLocaleDateString()
                    : "—"}
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
                      <DropdownMenuItem onClick={() => setResettingId(s.id)}>
                        <KeyRound className="mr-2 h-4 w-4" /> Reset PIN
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={async () => {
                          if (
                            !confirm(
                              `Delete ${s.full_name}? This removes all their training progress.`,
                            )
                          )
                            return;
                          await deleteTrainingStaff(s.id);
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
        <EditStaffDialog
          staff={editing}
          locations={locations}
          onClose={() => setEditing(null)}
        />
      ) : null}

      {resettingId ? (
        <ResetPinDialog
          staffId={resettingId}
          onClose={(pin) => {
            setResettingId(null);
            setNewPin(pin);
          }}
        />
      ) : null}

      {newPin ? (
        <Dialog open onOpenChange={(o) => !o && setNewPin(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>PIN reset</DialogTitle>
              <DialogDescription>
                Share this PIN with the staff member. It replaces their old one.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-card p-4 text-center">
              <code className="font-mono text-3xl font-semibold">
                {newPin}
              </code>
            </div>
            <DialogFooter>
              <Button
                variant="ghost"
                onClick={() => navigator.clipboard.writeText(newPin)}
                className="gap-1.5"
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
              <Button variant="accent" onClick={() => setNewPin(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}

function EditStaffDialog({
  staff,
  locations,
  onClose,
}: {
  staff: StaffRow;
  locations: { id: string; name: string }[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(staff.full_name);
  const [staffType, setStaffType] = useState(staff.staff_type);
  const [locationId, setLocationId] = useState(staff.location_id ?? "");
  const [email, setEmail] = useState(staff.email ?? "");
  const [phone, setPhone] = useState(staff.phone ?? "");
  const [startDate, setStartDate] = useState(staff.start_date ?? "");
  const [notes, setNotes] = useState(staff.notes ?? "");
  const [isActive, setIsActive] = useState(staff.is_active);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await updateTrainingStaff({
        id: staff.id,
        fullName,
        staffType,
        locationId: locationId || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        startDate: startDate || null,
        notes: notes.trim() || null,
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
          <DialogTitle>Edit {staff.full_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="e-name">Full name</Label>
            <Input
              id="e-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="e-type">Role</Label>
              <select
                id="e-type"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={staffType}
                onChange={(e) =>
                  setStaffType(e.target.value as typeof staff.staff_type)
                }
              >
                {TRAINING_STAFF_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {TRAINING_STAFF_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="e-loc">Location</Label>
              <select
                id="e-loc"
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
          <div className="space-y-2">
            <Label htmlFor="e-start">Start date</Label>
            <Input
              id="e-start"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
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
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4"
            />
            Active (can sign into the kiosk)
          </label>
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

function ResetPinDialog({
  staffId,
  onClose,
}: {
  staffId: string;
  onClose: (pin: string | null) => void;
}) {
  const [customPin, setCustomPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (customPin && !/^\d{4,6}$/.test(customPin)) {
      setError("PIN must be 4–6 digits or left blank.");
      return;
    }
    startTransition(async () => {
      const res = await resetStaffPin({
        id: staffId,
        pin: customPin || undefined,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      onClose(("pin" in res ? res.pin : null) ?? null);
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset PIN</DialogTitle>
          <DialogDescription>
            Generate a new PIN. Leave blank for an auto-generated one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="rp-pin">New PIN (optional)</Label>
            <Input
              id="rp-pin"
              inputMode="numeric"
              maxLength={6}
              value={customPin}
              onChange={(e) => setCustomPin(e.target.value.replace(/\D/g, ""))}
              placeholder="4-6 digits, blank = auto"
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onClose(null)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Resetting…" : "Reset PIN"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

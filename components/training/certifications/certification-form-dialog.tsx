"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

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
import { createCertification } from "@/components/training/actions";
import { TRAINING_STAFF_TYPE_SHORT } from "@/lib/constants/training";
import type { TrainingStaff } from "@/lib/types/database";

interface CertificationFormDialogProps {
  staff: Pick<TrainingStaff, "id" | "full_name" | "staff_type">[];
  defaultStaffId?: string;
}

const COMMON_KINDS = [
  "Food Handler",
  "ServSafe Manager",
  "TIPS / Alcohol Awareness",
  "Allergen Awareness",
  "CPR / First Aid",
  "OSHA",
];

export function CertificationFormDialog({
  staff,
  defaultStaffId,
}: CertificationFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [staffId, setStaffId] = useState(defaultStaffId ?? staff[0]?.id ?? "");
  const [kind, setKind] = useState(COMMON_KINDS[0]);
  const [name, setName] = useState("");
  const [issuingBody, setIssuingBody] = useState("");
  const [issuedOn, setIssuedOn] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expiresOn, setExpiresOn] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStaffId(defaultStaffId ?? staff[0]?.id ?? "");
    setKind(COMMON_KINDS[0]);
    setName("");
    setIssuingBody("");
    setIssuedOn(new Date().toISOString().slice(0, 10));
    setExpiresOn("");
    setDocumentUrl("");
    setNotes("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!staffId) {
      setError("Pick a team member");
      return;
    }
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const res = await createCertification({
        staffId,
        kind,
        name,
        issuingBody: issuingBody || null,
        issuedOn,
        expiresOn: expiresOn || null,
        documentUrl: documentUrl || null,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        setOpen(v);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Add cert
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add certification</DialogTitle>
          <DialogDescription>
            Food Handler, ServSafe, TIPS, or any credential with an expiration.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cert-user">Team member</Label>
              <select
                id="cert-user"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">— Select —</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {`${p.full_name} (${TRAINING_STAFF_TYPE_SHORT[p.staff_type]})`}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-kind">Kind</Label>
              <select
                id="cert-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              >
                {COMMON_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cert-name">Display name</Label>
            <Input
              id="cert-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. NY State Food Handler"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cert-body">Issuing body</Label>
              <Input
                id="cert-body"
                value={issuingBody}
                onChange={(e) => setIssuingBody(e.target.value)}
                placeholder="e.g. NYSDOH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-url">Document URL</Label>
              <Input
                id="cert-url"
                type="url"
                value={documentUrl}
                onChange={(e) => setDocumentUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-issued">Issued on</Label>
              <Input
                id="cert-issued"
                type="date"
                value={issuedOn}
                onChange={(e) => setIssuedOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cert-expires">Expires on</Label>
              <Input
                id="cert-expires"
                type="date"
                value={expiresOn}
                onChange={(e) => setExpiresOn(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cert-notes">Notes</Label>
            <Textarea
              id="cert-notes"
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
          <Button
            type="button"
            variant="ghost"
            onClick={() => setOpen(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Add certification"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

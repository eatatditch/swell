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
import { createDecision } from "@/components/founder/decisions/actions";
import type { ProfileLite } from "@/lib/types/database";

interface DecisionFormDialogProps {
  staff: ProfileLite[];
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function DecisionFormDialog({ staff }: DecisionFormDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [decision, setDecision] = useState("");
  const [ownerId, setOwnerId] = useState<string>("");
  const [decidedOn, setDecidedOn] = useState<string>(todayISO());
  const [followUp, setFollowUp] = useState("");
  const [followUpDue, setFollowUpDue] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setContext("");
    setDecision("");
    setOwnerId("");
    setDecidedOn(todayISO());
    setFollowUp("");
    setFollowUpDue("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!decision.trim()) {
      setError("Decision is required");
      return;
    }
    startTransition(async () => {
      const res = await createDecision({
        title,
        decision,
        context: context || null,
        ownerId: ownerId || null,
        decidedOn,
        followUp: followUp || null,
        followUpDue: followUpDue || null,
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
          Log decision
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a decision</DialogTitle>
          <DialogDescription>
            Capture what was decided, the context, and any follow-up owner.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dl-title">Title</Label>
            <Input
              id="dl-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              placeholder="e.g. Move brunch launch to September"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-context">Context</Label>
            <Textarea
              id="dl-context"
              rows={3}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="What problem were we solving? Who weighed in?"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-decision">Decision</Label>
            <Textarea
              id="dl-decision"
              rows={3}
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              placeholder="What we're doing and why."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dl-owner">Owner</Label>
              <select
                id="dl-owner"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">— Unassigned —</option>
                {staff.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name ?? p.email ?? "(no name)"}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dl-date">Decided on</Label>
              <Input
                id="dl-date"
                type="date"
                value={decidedOn}
                onChange={(e) => setDecidedOn(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-followup">Follow-up</Label>
            <Textarea
              id="dl-followup"
              rows={2}
              value={followUp}
              onChange={(e) => setFollowUp(e.target.value)}
              placeholder="What needs to happen next (optional)."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dl-followup-due">Follow-up due</Label>
            <Input
              id="dl-followup-due"
              type="date"
              value={followUpDue}
              onChange={(e) => setFollowUpDue(e.target.value)}
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
          <Button
            variant="accent"
            onClick={submit}
            disabled={pending || !title.trim() || !decision.trim()}
          >
            {pending ? "Saving…" : "Log decision"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

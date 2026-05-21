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
import { createAdRequest } from "@/components/marketing/actions";
import {
  AD_CHANNELS,
  AD_CHANNEL_LABELS,
  AD_REQUEST_STATUSES,
  AD_REQUEST_STATUS_LABELS,
} from "@/lib/constants/marketing";
import type { AdChannel, AdRequestStatus } from "@/lib/types/database";

interface Props {
  campaigns: { id: string; name: string }[];
  triggerLabel?: string;
}

export function AdRequestDialog({ campaigns, triggerLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [channel, setChannel] = useState<AdChannel>("meta");
  const [goal, setGoal] = useState("");
  const [copy, setCopy] = useState("");
  const [budget, setBudget] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [status, setStatus] = useState<AdRequestStatus>("requested");
  const [campaignId, setCampaignId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setChannel("meta");
    setGoal("");
    setCopy("");
    setBudget("");
    setStartsOn("");
    setEndsOn("");
    setStatus("requested");
    setCampaignId("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    startTransition(async () => {
      const res = await createAdRequest({
        title,
        channel,
        goal: goal || null,
        copy: copy || null,
        budget: budget || null,
        startsOn: startsOn || null,
        endsOn: endsOn || null,
        status,
        campaignId: campaignId || null,
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
      onOpenChange={(o) => {
        if (!o) reset();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> {triggerLabel ?? "Request ad"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request an ad</DialogTitle>
          <DialogDescription>
            Adds an ad request to the tracker. Use this for paid creative —
            organic content lives on the content board.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="a-title">Title *</Label>
            <Input
              id="a-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Happy Hour Bay Shore — Reel A"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="a-channel">Channel</Label>
              <select
                id="a-channel"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value as AdChannel)}
              >
                {AD_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {AD_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-status">Status</Label>
              <select
                id="a-status"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as AdRequestStatus)
                }
              >
                {AD_REQUEST_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {AD_REQUEST_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-goal">Goal / audience</Label>
            <Input
              id="a-goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g. drive Friday Happy Hour traffic at Bay Shore"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="a-budget">Budget</Label>
              <Input
                id="a-budget"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="$1,200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-start">Starts</Label>
              <Input
                id="a-start"
                type="date"
                value={startsOn}
                onChange={(e) => setStartsOn(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="a-end">Ends</Label>
              <Input
                id="a-end"
                type="date"
                value={endsOn}
                onChange={(e) => setEndsOn(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-campaign">Campaign</Label>
            <select
              id="a-campaign"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
            >
              <option value="">— None —</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="a-copy">Ad copy</Label>
            <Textarea
              id="a-copy"
              rows={3}
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              placeholder="Headline / body copy. Keep it tight."
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Request ad"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Sparkles } from "lucide-react";

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
import { createCampaign } from "@/components/marketing/actions";
import {
  CAMPAIGN_STATUSES,
  CAMPAIGN_STATUS_LABELS,
  CONTENT_CHANNELS,
  CONTENT_CHANNEL_LABELS,
} from "@/lib/constants/marketing";
import { CAMPAIGN_TYPES } from "@/lib/data/marketing-sample";
import { cn } from "@/lib/utils";

interface Props {
  locations: { id: string; name: string }[];
  triggerLabel?: string;
}

export function CampaignBuilderDialog({ locations, triggerLabel }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<string>("planning");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [locationId, setLocationId] = useState("");
  const [budget, setBudget] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setType("");
    setName("");
    setGoal("");
    setDescription("");
    setStatus("planning");
    setStartsOn("");
    setEndsOn("");
    setLocationId("");
    setBudget("");
    setChannels([]);
    setError(null);
  }

  function submit() {
    setError(null);
    if (!name.trim()) {
      setError("Campaign name is required.");
      return;
    }
    startTransition(async () => {
      const res = await createCampaign({
        name,
        theme: type || null,
        goal: goal || null,
        description: description || null,
        status,
        startsOn: startsOn || null,
        endsOn: endsOn || null,
        locationId: locationId || null,
        budget: budget || null,
        channels,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      reset();
      setOpen(false);
      if ("id" in res && res.id) {
        router.push(`/marketing/campaigns/${res.id}`);
        return;
      }
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
          <Plus className="h-4 w-4" /> {triggerLabel ?? "Build campaign"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" /> Build a campaign
          </DialogTitle>
          <DialogDescription>
            Pick a type to seed the name, then fine-tune.
          </DialogDescription>
        </DialogHeader>

        {!type ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick a campaign type</p>
            <div className="grid max-h-96 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
              {CAMPAIGN_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setName(`${t} campaign`);
                  }}
                  className="rounded-lg border bg-card p-3 text-left text-sm font-medium transition-colors hover:bg-muted"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center rounded-full bg-accent/15 px-2 py-0.5 font-medium text-accent">
                {type}
              </span>
              <button
                type="button"
                onClick={() => setType("")}
                className="underline"
              >
                Change type
              </button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal">Goal</Label>
              <Input
                id="goal"
                placeholder="e.g. drive lunch covers Mon–Fri"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="starts">Starts</Label>
                <Input
                  id="starts"
                  type="date"
                  value={startsOn}
                  onChange={(e) => setStartsOn(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ends">Ends</Label>
                <Input
                  id="ends"
                  type="date"
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="loc">Location</Label>
                <select
                  id="loc"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">All locations</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget">Budget</Label>
                <Input
                  id="budget"
                  placeholder="$1,500"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Channels</Label>
              <div className="flex flex-wrap gap-2">
                {CONTENT_CHANNELS.map((c) => {
                  const active = channels.includes(c);
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() =>
                        setChannels((cur) =>
                          active ? cur.filter((x) => x !== c) : [...cur, c],
                        )
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        active
                          ? "border-accent bg-accent/15 text-accent"
                          : "border-input bg-card hover:bg-muted",
                      )}
                    >
                      {CONTENT_CHANNEL_LABELS[c]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {CAMPAIGN_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CAMPAIGN_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Notes</Label>
              <Textarea
                id="desc"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Anything else worth knowing."
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
                {pending ? "Building…" : "Build campaign"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

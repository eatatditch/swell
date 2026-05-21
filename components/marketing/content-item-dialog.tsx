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
import { createContentItem } from "@/components/marketing/actions";
import {
  CONTENT_CHANNELS,
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUSES,
  CONTENT_STATUS_LABELS,
} from "@/lib/constants/marketing";
import type {
  ContentChannel,
  ContentStatus,
} from "@/lib/types/database";

interface Props {
  campaigns: { id: string; name: string }[];
  defaultChannel?: ContentChannel;
  triggerLabel?: string;
  channelFilter?: ContentChannel[];
}

export function ContentItemDialog({
  campaigns,
  defaultChannel,
  triggerLabel,
  channelFilter,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const channels = channelFilter ?? CONTENT_CHANNELS;
  const [channel, setChannel] = useState<ContentChannel>(
    defaultChannel ?? channels[0],
  );
  const [status, setStatus] = useState<ContentStatus>("drafting");
  const [campaignId, setCampaignId] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [caption, setCaption] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTitle("");
    setChannel(defaultChannel ?? channels[0]);
    setStatus("drafting");
    setCampaignId("");
    setScheduledFor("");
    setCaption("");
    setBody("");
    setNotes("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    startTransition(async () => {
      const res = await createContentItem({
        title,
        channel,
        status,
        campaignId: campaignId || null,
        scheduledFor: scheduledFor
          ? new Date(scheduledFor).toISOString()
          : null,
        caption: caption || null,
        body: body || null,
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

  const isMessage = channel === "sms" || channel === "email";

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
          <Plus className="h-4 w-4" /> {triggerLabel ?? "New content"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>New content item</DialogTitle>
          <DialogDescription>
            Adds to the content board. Slot it onto a campaign + schedule when
            ready.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="c-title">Title *</Label>
            <Input
              id="c-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isMessage
                  ? "e.g. Tuesday tonight-only $5 margs"
                  : "e.g. Hang 10 Marg slow-pour reel"
              }
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-channel">Channel</Label>
              <select
                id="c-channel"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={channel}
                onChange={(e) => setChannel(e.target.value as ContentChannel)}
              >
                {channels.map((c) => (
                  <option key={c} value={c}>
                    {CONTENT_CHANNEL_LABELS[c]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-status">Status</Label>
              <select
                id="c-status"
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => setStatus(e.target.value as ContentStatus)}
              >
                {CONTENT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {CONTENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="c-campaign">Campaign</Label>
              <select
                id="c-campaign"
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
              <Label htmlFor="c-when">Scheduled for</Label>
              <Input
                id="c-when"
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
            </div>
          </div>
          {isMessage ? (
            <div className="space-y-2">
              <Label htmlFor="c-body">
                {channel === "sms" ? "Message" : "Body"}
              </Label>
              <Textarea
                id="c-body"
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder={
                  channel === "sms"
                    ? "Keep it under 160 chars. Reply STOP to opt out."
                    : "Email body"
                }
              />
              {channel === "sms" ? (
                <p className="text-xs text-muted-foreground">
                  {body.length} chars · {Math.ceil(body.length / 160)} segment
                  {Math.ceil(body.length / 160) === 1 ? "" : "s"}
                </p>
              ) : null}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="c-caption">Caption</Label>
              <Textarea
                id="c-caption"
                rows={3}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="The thing we'd actually post."
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="c-notes">Notes</Label>
            <Textarea
              id="c-notes"
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
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Add to board"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { createSubscriber } from "@/components/marketing/subscriber-actions";
import { TagInput } from "@/components/marketing/tag-input";

interface Props {
  knownTags: string[];
}

export function CreateSubscriberDialog({ knownTags }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [source, setSource] = useState("manual");
  const [optInEmail, setOptInEmail] = useState(true);
  const [optInSms, setOptInSms] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setName("");
    setEmail("");
    setPhone("");
    setTags([]);
    setSource("manual");
    setOptInEmail(true);
    setOptInSms(false);
    setNotes("");
    setError(null);
  }

  function submit() {
    setError(null);
    if (!email.trim() && !phone.trim()) {
      setError("Need at least an email or phone.");
      return;
    }
    startTransition(async () => {
      const res = await createSubscriber({
        name: name || null,
        email: email || null,
        phone: phone || null,
        tags,
        source: source || null,
        optInEmail,
        optInSms,
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
      onOpenChange={(o) => {
        if (!o) reset();
        setOpen(o);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add subscriber
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add subscriber</DialogTitle>
          <DialogDescription>
            One person who consented to hear from us. Tag them so the right
            sends find them.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="s-name">Name</Label>
            <Input
              id="s-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input
                id="s-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input
                id="s-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 555-5555"
              />
            </div>
          </div>
          <TagInput value={tags} onChange={setTags} known={knownTags} />
          <div className="space-y-2">
            <Label htmlFor="s-source">Source</Label>
            <Input
              id="s-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="manual · Surf Club signup · catering form"
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-notes">Notes</Label>
            <Textarea
              id="s-notes"
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
            {pending ? "Adding…" : "Add subscriber"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

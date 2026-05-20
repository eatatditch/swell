"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarHeart } from "lucide-react";

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
import { convertLeadToEvent } from "@/components/catering/leads/actions";
import type { LeadWithOwner } from "@/lib/server/catering";
import type { Location } from "@/lib/types/database";

interface ConvertToEventDialogProps {
  lead: LeadWithOwner;
  locations: Location[];
}

export function ConvertToEventDialog({
  lead,
  locations,
}: ConvertToEventDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(
    `${lead.contact.full_name}${lead.event_type ? ` — ${lead.event_type}` : ""}`,
  );
  const [eventDate, setEventDate] = useState(lead.desired_date ?? "");
  const [locationId, setLocationId] = useState<string>(
    lead.location_id ??
      locations.find((l) => l.slug !== "company_wide")?.id ??
      "",
  );
  const [error, setError] = useState<string | null>(null);

  function submit() {
    setError(null);
    if (!title.trim() || !eventDate || !locationId) {
      setError("Title, date, and location are required");
      return;
    }
    startTransition(async () => {
      const res = await convertLeadToEvent({
        leadId: lead.id,
        title: title.trim(),
        eventDate,
        locationId,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const id = res.event?.id;
      if (id) {
        router.push(`/catering/events/${id}`);
      }
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="accent" size="sm" className="gap-1.5">
          <CalendarHeart className="h-4 w-4" />
          Convert to event
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Convert lead to event</DialogTitle>
          <DialogDescription>
            Creates a BEO record linked to this lead and marks the lead as
            booked. You can fill in menu and logistics afterward.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cve-title">Event title</Label>
            <Input
              id="cve-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cve-date">Event date</Label>
            <Input
              id="cve-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cve-loc">Location</Label>
            <select
              id="cve-loc"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              disabled={pending}
            >
              {locations
                .filter((l) => l.slug !== "company_wide")
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
            </select>
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
            type="button"
            variant="accent"
            onClick={submit}
            disabled={pending || !title.trim() || !eventDate || !locationId}
          >
            {pending ? "Converting…" : "Create event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

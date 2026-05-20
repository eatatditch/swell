"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  createCateringEvent,
  updateCateringEvent,
} from "@/components/catering/events/actions";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  centsToDollarString,
} from "@/lib/constants/catering";
import type {
  CateringEvent,
  CateringEventStatus,
  CateringServiceType,
  Location,
} from "@/lib/types/database";

interface EventFormProps {
  locations: Location[];
  event?: CateringEvent;
  defaultLocationId?: string | null;
  defaultLeadId?: string | null;
}

export function EventForm({
  locations,
  event,
  defaultLocationId,
  defaultLeadId,
}: EventFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState(event?.title ?? "");
  const [status, setStatus] = useState<CateringEventStatus>(
    event?.status ?? "booked",
  );
  const [serviceType, setServiceType] = useState<CateringServiceType>(
    event?.service_type ?? "buffet",
  );
  const [eventDate, setEventDate] = useState(event?.event_date ?? "");
  const [startTime, setStartTime] = useState(event?.start_time?.slice(0, 5) ?? "");
  const [endTime, setEndTime] = useState(event?.end_time?.slice(0, 5) ?? "");
  const [guestCount, setGuestCount] = useState(
    event?.guest_count != null ? String(event.guest_count) : "",
  );
  const [locationId, setLocationId] = useState<string>(
    event?.location_id ?? defaultLocationId ?? "",
  );

  const [venue, setVenue] = useState(event?.venue ?? "");
  const [room, setRoom] = useState(event?.room ?? "");
  const [contactName, setContactName] = useState(event?.contact_name ?? "");
  const [contactPhone, setContactPhone] = useState(event?.contact_phone ?? "");
  const [contactEmail, setContactEmail] = useState(event?.contact_email ?? "");
  const [billingName, setBillingName] = useState(event?.billing_name ?? "");
  const [billingAddress, setBillingAddress] = useState(
    event?.billing_address ?? "",
  );
  const [totalQuoted, setTotalQuoted] = useState(
    centsToDollarString(event?.total_quoted_cents ?? null),
  );

  const [allergens, setAllergens] = useState(event?.allergens_notes ?? "");
  const [special, setSpecial] = useState(event?.special_requests ?? "");
  const [setupNotes, setSetupNotes] = useState(event?.setup_notes ?? "");
  const [breakdownNotes, setBreakdownNotes] = useState(
    event?.breakdown_notes ?? "",
  );
  const [equipmentNotes, setEquipmentNotes] = useState(
    event?.equipment_notes ?? "",
  );
  const [staffingNotes, setStaffingNotes] = useState(
    event?.staffing_notes ?? "",
  );
  const [beverageNotes, setBeverageNotes] = useState(event?.beverage_notes ?? "");
  const [internalNotes, setInternalNotes] = useState(event?.internal_notes ?? "");

  function submit() {
    setError(null);
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!eventDate) {
      setError("Event date is required");
      return;
    }
    if (!locationId) {
      setError("Location is required");
      return;
    }
    startTransition(async () => {
      const payload = {
        locationId,
        leadId: event?.lead_id ?? defaultLeadId ?? null,
        title: title.trim(),
        status,
        serviceType,
        eventDate,
        startTime: startTime || null,
        endTime: endTime || null,
        guestCount: guestCount ? Number.parseInt(guestCount, 10) : null,
        venue: venue || null,
        room: room || null,
        contactName: contactName || null,
        contactPhone: contactPhone || null,
        contactEmail: contactEmail || null,
        billingName: billingName || null,
        billingAddress: billingAddress || null,
        allergensNotes: allergens || null,
        specialRequests: special || null,
        setupNotes: setupNotes || null,
        breakdownNotes: breakdownNotes || null,
        equipmentNotes: equipmentNotes || null,
        staffingNotes: staffingNotes || null,
        beverageNotes: beverageNotes || null,
        internalNotes: internalNotes || null,
        totalQuoted: totalQuoted ? Number.parseFloat(totalQuoted) : null,
      };

      const res = event
        ? await updateCateringEvent({ id: event.id, ...payload })
        : await createCateringEvent(payload);

      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const id = (res as { event?: { id: string } }).event?.id ?? event?.id;
      router.push(`/catering/events/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="basics">
        <TabsList className="w-full max-w-2xl">
          <TabsTrigger value="basics" className="flex-1">
            Basics
          </TabsTrigger>
          <TabsTrigger value="logistics" className="flex-1">
            Logistics
          </TabsTrigger>
          <TabsTrigger value="notes" className="flex-1">
            Notes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="basics" className="space-y-4">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ef-title">Title *</Label>
                <Input
                  id="ef-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Smith Wedding"
                  autoFocus
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-date">Date *</Label>
                <Input
                  id="ef-date"
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-loc">Location *</Label>
                <select
                  id="ef-loc"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  disabled={pending}
                >
                  <option value="">— Select —</option>
                  {locations
                    .filter((l) => l.slug !== "company_wide")
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-start">Start time</Label>
                <Input
                  id="ef-start"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-end">End time</Label>
                <Input
                  id="ef-end"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-status">Status</Label>
                <select
                  id="ef-status"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value as CateringEventStatus)
                  }
                  disabled={pending}
                >
                  {EVENT_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {EVENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-service">Service type</Label>
                <select
                  id="ef-service"
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
                  value={serviceType}
                  onChange={(e) =>
                    setServiceType(e.target.value as CateringServiceType)
                  }
                  disabled={pending}
                >
                  {SERVICE_TYPES.map((s) => (
                    <option key={s} value={s}>
                      {SERVICE_TYPE_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-guests">Guest count</Label>
                <Input
                  id="ef-guests"
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={guestCount}
                  onChange={(e) => setGuestCount(e.target.value)}
                  placeholder="0"
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-quote">Total quoted ($)</Label>
                <Input
                  id="ef-quote"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={totalQuoted}
                  onChange={(e) => setTotalQuoted(e.target.value)}
                  placeholder="0.00"
                  disabled={pending}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-4">
          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="font-display text-base font-bold">Venue</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ef-venue">Venue name</Label>
                <Input
                  id="ef-venue"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-room">Room / area</Label>
                <Input
                  id="ef-room"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="font-display text-base font-bold">Client contact</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ef-cname">Contact name</Label>
                <Input
                  id="ef-cname"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-cphone">Contact phone</Label>
                <Input
                  id="ef-cphone"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ef-cemail">Contact email</Label>
                <Input
                  id="ef-cemail"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-2xl border bg-card p-6">
            <h3 className="font-display text-base font-bold">Billing</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="ef-bname">Billing name</Label>
                <Input
                  id="ef-bname"
                  value={billingName}
                  onChange={(e) => setBillingName(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ef-baddr">Billing address</Label>
                <Textarea
                  id="ef-baddr"
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <div className="grid gap-4 rounded-2xl border bg-card p-6 sm:grid-cols-2">
            <NoteField
              id="ef-allergens"
              label="Allergens / dietary"
              value={allergens}
              onChange={setAllergens}
              placeholder="Gluten-free entree for table 5…"
              disabled={pending}
            />
            <NoteField
              id="ef-special"
              label="Special requests"
              value={special}
              onChange={setSpecial}
              placeholder="Anniversary cake, photo backdrop…"
              disabled={pending}
            />
            <NoteField
              id="ef-setup"
              label="Setup notes"
              value={setupNotes}
              onChange={setSetupNotes}
              placeholder="Arrive 1.5h prior. Long tables 8-tops."
              disabled={pending}
            />
            <NoteField
              id="ef-breakdown"
              label="Breakdown notes"
              value={breakdownNotes}
              onChange={setBreakdownNotes}
              placeholder="Out by 11pm. Trash to dumpster…"
              disabled={pending}
            />
            <NoteField
              id="ef-equipment"
              label="Equipment"
              value={equipmentNotes}
              onChange={setEquipmentNotes}
              placeholder="2 chafers, 8 bus tubs, projector…"
              disabled={pending}
            />
            <NoteField
              id="ef-staffing"
              label="Staffing"
              value={staffingNotes}
              onChange={setStaffingNotes}
              placeholder="2 servers + 1 bartender for 4h…"
              disabled={pending}
            />
            <NoteField
              id="ef-bev"
              label="Beverage program"
              value={beverageNotes}
              onChange={setBeverageNotes}
              placeholder="Beer + wine only, signature cocktail…"
              disabled={pending}
            />
            <NoteField
              id="ef-internal"
              label="Internal notes"
              value={internalNotes}
              onChange={setInternalNotes}
              placeholder="Team-only context, NOT for client."
              disabled={pending}
            />
          </div>
        </TabsContent>
      </Tabs>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="accent"
          onClick={submit}
          disabled={pending}
        >
          {pending ? "Saving…" : event ? "Save changes" : "Save event"}
        </Button>
      </div>
    </div>
  );
}

function NoteField({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </div>
  );
}

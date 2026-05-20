"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ContactPicker,
  type ContactPickerValue,
} from "@/components/catering/contacts/contact-picker";
import { createCateringContact } from "@/components/catering/contacts/actions";
import { createQuote } from "@/components/catering/quotes/actions";
import {
  SERVICE_TYPES,
  SERVICE_TYPE_LABELS,
  basisPointsToPercent,
  percentToBasisPoints,
} from "@/lib/constants/catering";
import type {
  CateringServiceType,
  Location,
} from "@/lib/types/database";
import type { ContactLite } from "@/lib/server/catering";

interface QuoteFormProps {
  locations: Location[];
  contacts: ContactLite[];
  defaultLocationId?: string | null;
  defaultContact?: ContactLite | null;
}

export function QuoteForm({
  locations,
  contacts,
  defaultLocationId,
  defaultContact,
}: QuoteFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [contactValue, setContactValue] = useState<ContactPickerValue | null>(
    defaultContact
      ? {
          mode: "existing",
          contactId: defaultContact.id,
          contact: defaultContact,
        }
      : null,
  );
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [serviceType, setServiceType] = useState<CateringServiceType | "">("");
  const [locationId, setLocationId] = useState<string>(
    defaultLocationId ?? "",
  );
  const [validUntil, setValidUntil] = useState("");
  const [taxPercent, setTaxPercent] = useState("8.625");
  const [gratuityPercent, setGratuityPercent] = useState("0");

  const canSubmit =
    !!contactValue &&
    title.trim().length > 0 &&
    (contactValue.mode === "existing" ||
      contactValue.draft.fullName.trim().length > 0);

  function submit() {
    setError(null);
    if (!contactValue || !title.trim()) {
      setError("Contact and title are required");
      return;
    }
    startTransition(async () => {
      let contactId: string;
      if (contactValue.mode === "existing") {
        contactId = contactValue.contactId;
      } else {
        const draft = contactValue.draft;
        const created = await createCateringContact({
          fullName: draft.fullName.trim(),
          email: draft.email || null,
          phone: draft.phone || null,
          company: draft.company || null,
        });
        if ("error" in created && created.error) {
          setError(created.error);
          return;
        }
        contactId = created.contact!.id;
      }

      const res = await createQuote({
        contactId,
        locationId: locationId || null,
        title: title.trim(),
        eventDate: eventDate || null,
        guestCount: guestCount ? Number.parseInt(guestCount, 10) : null,
        serviceType: serviceType || null,
        validUntil: validUntil || null,
        taxRateBps: percentToBasisPoints(Number.parseFloat(taxPercent) || 0),
        gratuityRateBps: percentToBasisPoints(
          Number.parseFloat(gratuityPercent) || 0,
        ),
      });

      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push(`/catering/quotes/${res.quote!.id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6">
      <ContactPicker
        contacts={contacts}
        value={contactValue}
        onChange={setContactValue}
        disabled={pending}
      />

      <div className="space-y-2">
        <Label htmlFor="qf-title">Title *</Label>
        <Input
          id="qf-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Smith wedding · September buffet"
          disabled={pending}
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="qf-date">Event date</Label>
          <Input
            id="qf-date"
            type="date"
            value={eventDate}
            onChange={(e) => setEventDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qf-guests">Guest count</Label>
          <Input
            id="qf-guests"
            type="number"
            min="0"
            value={guestCount}
            onChange={(e) => setGuestCount(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="qf-svc">Service type</Label>
          <select
            id="qf-svc"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={serviceType}
            onChange={(e) =>
              setServiceType(e.target.value as CateringServiceType | "")
            }
            disabled={pending}
          >
            <option value="">—</option>
            {SERVICE_TYPES.map((s) => (
              <option key={s} value={s}>
                {SERVICE_TYPE_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="qf-loc">Location</Label>
          <select
            id="qf-loc"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={pending}
          >
            <option value="">—</option>
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
          <Label htmlFor="qf-valid">Valid until</Label>
          <Input
            id="qf-valid"
            type="date"
            value={validUntil}
            onChange={(e) => setValidUntil(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="qf-tax">Tax %</Label>
            <Input
              id="qf-tax"
              type="number"
              step="0.001"
              min="0"
              value={taxPercent}
              onChange={(e) => setTaxPercent(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qf-grat">Gratuity %</Label>
            <Input
              id="qf-grat"
              type="number"
              step="0.001"
              min="0"
              value={gratuityPercent}
              onChange={(e) => setGratuityPercent(e.target.value)}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-2">
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
          disabled={pending || !canSubmit}
        >
          {pending ? "Creating…" : "Create quote"}
        </Button>
      </div>
    </div>
  );
}

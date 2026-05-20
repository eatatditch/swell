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
import {
  createCateringLead,
  updateCateringLead,
} from "@/components/catering/leads/actions";
import { centsToDollarString } from "@/lib/constants/catering";
import type { ContactLite } from "@/lib/server/catering";
import type { CateringLead, Location } from "@/lib/types/database";

interface LeadFormProps {
  locations: Location[];
  contacts: ContactLite[];
  defaultLocationId?: string | null;
  lead?: CateringLead;
  defaultContact?: ContactLite | null;
}

export function LeadForm({
  locations,
  contacts,
  defaultLocationId,
  lead,
  defaultContact,
}: LeadFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [contactValue, setContactValue] = useState<ContactPickerValue | null>(
    defaultContact
      ? { mode: "existing", contactId: defaultContact.id, contact: defaultContact }
      : null,
  );
  const [eventType, setEventType] = useState(lead?.event_type ?? "");
  const [desiredDate, setDesiredDate] = useState(lead?.desired_date ?? "");
  const [partySize, setPartySize] = useState(
    lead?.party_size != null ? String(lead.party_size) : "",
  );
  const [estimatedValue, setEstimatedValue] = useState(
    centsToDollarString(lead?.estimated_value_cents ?? null),
  );
  const [budgetLow, setBudgetLow] = useState(
    centsToDollarString(lead?.budget_low_cents ?? null),
  );
  const [budgetHigh, setBudgetHigh] = useState(
    centsToDollarString(lead?.budget_high_cents ?? null),
  );
  const [source, setSource] = useState(lead?.source ?? "");
  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [locationId, setLocationId] = useState<string>(
    lead?.location_id ?? defaultLocationId ?? "",
  );

  const canSubmit = (() => {
    if (!contactValue) return false;
    if (contactValue.mode === "new") {
      return contactValue.draft.fullName.trim().length > 0;
    }
    return true;
  })();

  function submit() {
    setError(null);
    if (!contactValue) {
      setError("Pick or create a contact");
      return;
    }
    if (
      contactValue.mode === "new" &&
      !contactValue.draft.fullName.trim()
    ) {
      setError("Contact name is required");
      return;
    }
    startTransition(async () => {
      const contactRef =
        contactValue.mode === "existing"
          ? { contactId: contactValue.contactId }
          : {
              newContact: {
                fullName: contactValue.draft.fullName.trim(),
                email: contactValue.draft.email || null,
                phone: contactValue.draft.phone || null,
                company: contactValue.draft.company || null,
              },
            };

      const payload = {
        ...contactRef,
        eventType: eventType || null,
        desiredDate: desiredDate || null,
        partySize: partySize ? Number.parseInt(partySize, 10) : null,
        estimatedValue: estimatedValue
          ? Number.parseFloat(estimatedValue)
          : null,
        budgetLow: budgetLow ? Number.parseFloat(budgetLow) : null,
        budgetHigh: budgetHigh ? Number.parseFloat(budgetHigh) : null,
        source: source || null,
        notes: notes || null,
        locationId: locationId || null,
      };

      const res = lead
        ? await updateCateringLead({ id: lead.id, ...payload })
        : await createCateringLead(payload);

      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const id = (res as { lead?: { id: string } }).lead?.id ?? lead?.id;
      router.push(`/catering/leads/${id}`);
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

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="lf-eventtype">Event type</Label>
          <Input
            id="lf-eventtype"
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            placeholder="Wedding, rehearsal dinner, corporate lunch…"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-date">Desired date</Label>
          <Input
            id="lf-date"
            type="date"
            value={desiredDate}
            onChange={(e) => setDesiredDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-party">Party size</Label>
          <Input
            id="lf-party"
            type="number"
            min="0"
            inputMode="numeric"
            value={partySize}
            onChange={(e) => setPartySize(e.target.value)}
            placeholder="0"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-loc">Location</Label>
          <select
            id="lf-loc"
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            disabled={pending}
          >
            <option value="">— Unassigned —</option>
            {locations
              .filter((l) => l.slug !== "company_wide")
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
          </select>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="lf-value">Estimated deal value ($)</Label>
          <Input
            id="lf-value"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={estimatedValue}
            onChange={(e) => setEstimatedValue(e.target.value)}
            placeholder="0.00"
            disabled={pending}
          />
          <p className="text-xs text-muted-foreground">
            Shows up in the pipeline value summary.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-blow">Budget low ($)</Label>
          <Input
            id="lf-blow"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={budgetLow}
            onChange={(e) => setBudgetLow(e.target.value)}
            placeholder="0.00"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lf-bhigh">Budget high ($)</Label>
          <Input
            id="lf-bhigh"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={budgetHigh}
            onChange={(e) => setBudgetHigh(e.target.value)}
            placeholder="0.00"
            disabled={pending}
          />
        </div>
      </section>

      <div className="space-y-2">
        <Label htmlFor="lf-source">Source</Label>
        <Input
          id="lf-source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="Website form, referral, walk-in…"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="lf-notes">Notes</Label>
        <Textarea
          id="lf-notes"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything captured during the initial inquiry."
          disabled={pending}
        />
      </div>

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
          {pending ? "Saving…" : lead ? "Save changes" : "Save lead"}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createCateringContact,
  updateCateringContact,
} from "@/components/catering/contacts/actions";
import type { CateringContact } from "@/lib/types/database";

interface ContactFormProps {
  contact?: CateringContact;
}

export function ContactForm({ contact }: ContactFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [fullName, setFullName] = useState(contact?.full_name ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [title, setTitle] = useState(contact?.title ?? "");
  const [address, setAddress] = useState(contact?.address ?? "");
  const [city, setCity] = useState(contact?.city ?? "");
  const [stateRegion, setStateRegion] = useState(contact?.state ?? "");
  const [postalCode, setPostalCode] = useState(contact?.postal_code ?? "");
  const [source, setSource] = useState(contact?.source ?? "");
  const [tags, setTags] = useState((contact?.tags ?? []).join(", "));
  const [notes, setNotes] = useState(contact?.notes ?? "");

  function submit() {
    setError(null);
    if (!fullName.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const payload = {
        fullName: fullName.trim(),
        email: email || null,
        phone: phone || null,
        company: company || null,
        title: title || null,
        address: address || null,
        city: city || null,
        state: stateRegion || null,
        postalCode: postalCode || null,
        source: source || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: notes || null,
      };
      const res = contact
        ? await updateCateringContact({ id: contact.id, ...payload })
        : await createCateringContact(payload);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      const id = (res as { contact?: { id: string } }).contact?.id ?? contact?.id;
      router.push(`/catering/contacts/${id}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 rounded-2xl border bg-card p-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cf-name">Full name *</Label>
          <Input
            id="cf-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            autoFocus
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-title">Title</Label>
          <Input
            id="cf-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Events Coordinator"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-company">Company</Label>
          <Input
            id="cf-company"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Optional"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-source">Source</Label>
          <Input
            id="cf-source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="Referral, website form, walk-in…"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-email">Email</Label>
          <Input
            id="cf-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-phone">Phone</Label>
          <Input
            id="cf-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(631) 555-0123"
            disabled={pending}
          />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-3">
          <Label htmlFor="cf-address">Street address</Label>
          <Input
            id="cf-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-city">City</Label>
          <Input
            id="cf-city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-state">State</Label>
          <Input
            id="cf-state"
            value={stateRegion}
            onChange={(e) => setStateRegion(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cf-zip">Postal code</Label>
          <Input
            id="cf-zip"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            disabled={pending}
          />
        </div>
      </section>

      <div className="space-y-2">
        <Label htmlFor="cf-tags">Tags</Label>
        <Input
          id="cf-tags"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="vip, corporate, repeat, allergy-aware"
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Comma-separated. Used for grouping and filtering across the CRM.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cf-notes">Notes</Label>
        <Textarea
          id="cf-notes"
          rows={5}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Preferences, history, dietary restrictions, internal context."
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
          disabled={pending || !fullName.trim()}
        >
          {pending ? "Saving…" : contact ? "Save changes" : "Save contact"}
        </Button>
      </div>
    </div>
  );
}

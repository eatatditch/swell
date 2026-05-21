"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Camera, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  updateSystemSettingsAction,
  uploadLogoAction,
} from "@/components/admin/settings/actions";
import type { SystemSettings } from "@/lib/types/database";

interface BrandFormProps {
  settings: SystemSettings;
}

export function BrandForm({ settings }: BrandFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(settings.company_name ?? "");
  const [logoUrl, setLogoUrl] = useState(settings.logo_url ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    settings.primary_color ?? "",
  );
  const [emailFromName, setEmailFromName] = useState(
    settings.default_email_from_name ?? "",
  );
  const [emailReplyTo, setEmailReplyTo] = useState(
    settings.default_reply_to ?? "",
  );
  const [emailSignature, setEmailSignature] = useState(
    settings.default_email_signature ?? "",
  );
  const [depositDollars, setDepositDollars] = useState(
    (settings.default_deposit_cents / 100).toFixed(2),
  );

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("logo", file);
    startUpload(async () => {
      const res = await uploadLogoAction(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setLogoUrl(res.url);
      router.refresh();
    });
    e.target.value = "";
  }

  function submit() {
    setError(null);
    setOkMessage(null);
    const dep = Number.parseFloat(depositDollars);
    if (Number.isNaN(dep) || dep < 0) {
      setError("Deposit must be a number");
      return;
    }
    startTransition(async () => {
      const res = await updateSystemSettingsAction({
        companyName: companyName.trim() || null,
        logoUrl: logoUrl.trim() || null,
        primaryColor: primaryColor.trim() || null,
        defaultEmailFromName: emailFromName.trim() || null,
        defaultEmailSignature: emailSignature.trim() || null,
        defaultReplyTo: emailReplyTo.trim() || null,
        defaultDepositDollars: dep,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Settings saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {okMessage ? (
        <Alert>
          <AlertDescription>{okMessage}</AlertDescription>
        </Alert>
      ) : null}

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Brand</h3>
          <p className="text-xs text-muted-foreground">
            Company name and logo show up on customer-facing quote pages and
            outbound email.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt="Logo"
                width={64}
                height={64}
                className="h-full w-full object-contain"
                unoptimized
              />
            ) : (
              <span className="text-xs text-muted-foreground">No logo</span>
            )}
          </div>
          <div className="space-y-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {logoUrl ? "Change logo" : "Upload logo"}
            </Button>
            <p className="text-xs text-muted-foreground">
              PNG or SVG recommended. Square crop works best.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickLogo}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf-name">Company name</Label>
            <Input
              id="bf-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Ditch Hospitality Group"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-color">Primary color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="bf-color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#F97316"
                disabled={pending}
              />
              {primaryColor && /^#?[0-9a-fA-F]{6}$/.test(primaryColor) ? (
                <div
                  className="h-9 w-9 shrink-0 rounded-md border"
                  style={{
                    backgroundColor: primaryColor.startsWith("#")
                      ? primaryColor
                      : `#${primaryColor}`,
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Email defaults</h3>
          <p className="text-xs text-muted-foreground">
            Used on system-sent mail (invites, quote sends, reminders).
            Individual operator sends still use their own Gmail address.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="bf-from">From name</Label>
            <Input
              id="bf-from"
              value={emailFromName}
              onChange={(e) => setEmailFromName(e.target.value)}
              placeholder="Ditch Catering"
              disabled={pending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bf-reply">Reply-to email</Label>
            <Input
              id="bf-reply"
              type="email"
              value={emailReplyTo}
              onChange={(e) => setEmailReplyTo(e.target.value)}
              placeholder="catering@eatatditch.com"
              disabled={pending}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bf-sig">Email signature</Label>
            <Textarea
              id="bf-sig"
              value={emailSignature}
              onChange={(e) => setEmailSignature(e.target.value)}
              rows={4}
              placeholder={"Cheers,\nThe Ditch Team\nwww.eatatditch.com"}
              disabled={pending}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Billing defaults</h3>
          <p className="text-xs text-muted-foreground">
            The default deposit amount used when a quote is accepted. Each
            location can still override.
          </p>
        </div>

        <div className="space-y-2 sm:max-w-sm">
          <Label htmlFor="bf-deposit">Default deposit ($)</Label>
          <Input
            id="bf-deposit"
            type="number"
            step="0.01"
            value={depositDollars}
            onChange={(e) => setDepositDollars(e.target.value)}
            disabled={pending}
          />
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </div>
  );
}

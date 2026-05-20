"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteUserAction } from "@/components/admin/users/actions";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";
import type { Location, Role } from "@/lib/types/database";

interface InviteUserFormProps {
  locations: Location[];
}

export function InviteUserForm({ locations }: InviteUserFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("team_member");
  const [phone, setPhone] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [locationIds, setLocationIds] = useState<string[]>([]);

  function toggleLocation(id: string) {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    setOkMessage(null);
    if (!email.trim() || !fullName.trim()) {
      setError("Name and email are required");
      return;
    }
    startTransition(async () => {
      const res = await inviteUserAction({
        email: email.trim(),
        fullName: fullName.trim(),
        role,
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        locationIds,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage(
        `Invite sent to ${email}. They'll get an email to set their password.`,
      );
      router.refresh();
      // Drop them back to the list after a short success state.
      setTimeout(() => router.push("/admin/users"), 1500);
    });
  }

  return (
    <div className="space-y-5">
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

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="iu-name">Full name</Label>
          <Input
            id="iu-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Alex Diaz"
            disabled={pending}
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iu-email">Work email</Label>
          <Input
            id="iu-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@eatatditch.com"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="iu-role">Role</Label>
          <select
            id="iu-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={pending}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="iu-title">Job title (optional)</Label>
          <Input
            id="iu-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Lead line cook"
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="iu-phone">Phone (optional)</Label>
          <Input
            id="iu-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Locations</Label>
        <p className="text-xs text-muted-foreground">
          Which locations should this user see? Pick &ldquo;Company wide&rdquo;
          for full visibility.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {locations.map((l) => (
            <label
              key={l.id}
              className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={locationIds.includes(l.id)}
                onChange={() => toggleLocation(l.id)}
                disabled={pending}
                className="h-4 w-4"
              />
              <span>{l.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/users")}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Sending invite…" : "Send invite"}
        </Button>
      </div>
    </div>
  );
}

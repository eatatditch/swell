"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateUserAction } from "@/components/admin/users/actions";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";
import type { Location, Profile, Role } from "@/lib/types/database";

interface EditUserFormProps {
  user: Profile & {
    locations: { id: string; slug: string; name: string }[];
  };
  locations: Location[];
}

export function EditUserForm({ user, locations }: EditUserFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [jobTitle, setJobTitle] = useState(user.job_title ?? "");
  const [startDate, setStartDate] = useState(user.start_date ?? "");
  const [bio, setBio] = useState(user.bio ?? "");
  const [isActive, setIsActive] = useState(user.is_active);
  const [locationIds, setLocationIds] = useState<string[]>(
    user.locations.map((l) => l.id),
  );

  function toggleLocation(id: string) {
    setLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  function submit() {
    setError(null);
    setOkMessage(null);
    if (!fullName.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const res = await updateUserAction(user.id, {
        fullName: fullName.trim(),
        role,
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        startDate: startDate || null,
        bio: bio.trim() || null,
        isActive,
        locationIds,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Saved");
      router.refresh();
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
          <Label htmlFor="eu-name">Full name</Label>
          <Input
            id="eu-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={user.email ?? ""} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Email is the sign-in identity and can&apos;t be changed here.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eu-role">Role</Label>
          <select
            id="eu-role"
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
          <Label htmlFor="eu-title">Job title</Label>
          <Input
            id="eu-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eu-phone">Phone</Label>
          <Input
            id="eu-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eu-start">Start date</Label>
          <Input
            id="eu-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eu-bio">Bio</Label>
          <Textarea
            id="eu-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A short description for the team roster."
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Locations</Label>
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

      <div className="space-y-2 rounded-md border bg-muted/30 p-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            disabled={pending}
            className="h-4 w-4"
          />
          <span>
            <strong className="font-medium">Active</strong> — uncheck to hide
            this user from pickers without deleting the account.
          </span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push("/admin/users")}
          disabled={pending}
        >
          Back
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

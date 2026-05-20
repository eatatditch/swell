"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import {
  updateMyProfileAction,
  uploadMyAvatarAction,
} from "@/components/profile/actions";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { Profile } from "@/lib/types/database";

interface ProfileFormProps {
  profile: Profile;
}

function initials(name: string | null, email: string | null) {
  const source = (name && name.trim()) || email || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [jobTitle, setJobTitle] = useState(profile.job_title ?? "");
  const [startDate, setStartDate] = useState(profile.start_date ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");

  function submit() {
    setError(null);
    setOkMessage(null);
    if (!fullName.trim()) {
      setError("Name is required");
      return;
    }
    startTransition(async () => {
      const res = await updateMyProfileAction({
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        jobTitle: jobTitle.trim() || null,
        startDate: startDate || null,
        bio: bio.trim() || null,
        avatarUrl: profile.avatar_url,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Profile updated");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <AvatarUploader
        currentUrl={profile.avatar_url}
        fallback={initials(profile.full_name, profile.email)}
        uploadAction={uploadMyAvatarAction}
      />

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
          <Label htmlFor="pf-name">Full name</Label>
          <Input
            id="pf-name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input value={profile.email ?? ""} disabled readOnly />
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Input value={ROLE_LABELS[profile.role]} disabled readOnly />
          <p className="text-xs text-muted-foreground">
            Role changes require an admin.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-title">Job title</Label>
          <Input
            id="pf-title"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Catering manager"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-phone">Phone</Label>
          <Input
            id="pf-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 555-5555"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pf-start">Start date</Label>
          <Input
            id="pf-start"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pf-bio">Bio</Label>
          <Textarea
            id="pf-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="A few sentences about yourself for the team."
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </div>
  );
}

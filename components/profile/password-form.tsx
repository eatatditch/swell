"use client";

import { useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeMyPasswordAction } from "@/components/profile/actions";

export function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  function submit() {
    setError(null);
    setOkMessage(null);
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirm) {
      setError("Passwords don't match");
      return;
    }
    startTransition(async () => {
      const res = await changeMyPasswordAction(newPassword);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Password changed. You'll stay signed in on this device.");
      setNewPassword("");
      setConfirm("");
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
          <Label htmlFor="pw-new">New password</Label>
          <Input
            id="pw-new"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-confirm">Confirm new password</Label>
          <Input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            disabled={pending}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </div>
  );
}

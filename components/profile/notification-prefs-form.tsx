"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { updateMyNotificationPreferencesAction } from "@/components/profile/actions";
import type { UserNotificationPreferences } from "@/lib/types/database";

interface NotificationPrefsFormProps {
  prefs: UserNotificationPreferences;
}

interface ToggleConfig {
  key: keyof Pick<
    UserNotificationPreferences,
    | "email_on_new_lead"
    | "email_on_quote_paid"
    | "email_on_comment"
    | "email_on_assignment"
    | "digest_daily"
  >;
  label: string;
  description: string;
}

const TOGGLES: ToggleConfig[] = [
  {
    key: "email_on_new_lead",
    label: "New leads",
    description: "Email me when a new catering lead lands on the pipeline.",
  },
  {
    key: "email_on_quote_paid",
    label: "Quote accepted",
    description: "Email me when a customer accepts a quote and pays a deposit.",
  },
  {
    key: "email_on_comment",
    label: "Comments + mentions",
    description: "Email me when someone @-mentions me or replies on a thread I'm in.",
  },
  {
    key: "email_on_assignment",
    label: "Task assigned to me",
    description: "Email me when a follow-up, event, or task is assigned to me.",
  },
  {
    key: "digest_daily",
    label: "Daily summary",
    description: "Send me a 7:00am digest with what's open and what's due today.",
  },
];

export function NotificationPrefsForm({ prefs }: NotificationPrefsFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [okMessage, setOkMessage] = useState<string | null>(null);

  const [state, setState] = useState(prefs);

  function toggle(key: ToggleConfig["key"], value: boolean) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function submit() {
    setError(null);
    setOkMessage(null);
    startTransition(async () => {
      const res = await updateMyNotificationPreferencesAction({
        email_on_new_lead: state.email_on_new_lead,
        email_on_quote_paid: state.email_on_quote_paid,
        email_on_comment: state.email_on_comment,
        email_on_assignment: state.email_on_assignment,
        digest_daily: state.digest_daily,
      });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOkMessage("Preferences saved");
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

      <div className="divide-y rounded-md border">
        {TOGGLES.map((t) => (
          <label
            key={t.key}
            className="flex cursor-pointer items-start justify-between gap-4 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium">{t.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t.description}
              </p>
            </div>
            <input
              type="checkbox"
              checked={state[t.key]}
              onChange={(e) => toggle(t.key, e.target.checked)}
              disabled={pending}
              className="mt-1 h-4 w-4"
            />
          </label>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}

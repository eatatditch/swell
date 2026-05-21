"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Sparkles } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateAssistantKbAction } from "@/components/admin/settings/actions";
import type { SystemSettings } from "@/lib/types/database";

export function AssistantKbForm({ settings }: { settings: SystemSettings }) {
  const router = useRouter();
  const [value, setValue] = useState(settings.assistant_kb ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateAssistantKbAction({ assistantKb: value });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
        <div className="text-sm">
          <p className="font-medium">Paloma reads this in front of every training search.</p>
          <p className="text-muted-foreground">
            Anything you put here is treated as ground truth for Ditch
            business facts. Lesson content stays its own source; this is the
            stuff that doesn&apos;t fit in a lesson (founder, locations,
            owner, contact info, brand voice notes). Markdown works.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="kb">Knowledge base (Markdown)</Label>
        <Textarea
          id="kb"
          rows={22}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          className="font-mono text-xs"
          placeholder="# Ditch — business facts..."
        />
        <p className="text-xs text-muted-foreground">
          {value.length.toLocaleString()} / 50,000 characters
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {saved ? (
        <Alert>
          <AlertDescription>
            Saved. Paloma will use the new knowledge base on her next answer.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending} className="gap-1.5">
          <Save className="h-4 w-4" />
          {pending ? "Saving…" : "Save knowledge base"}
        </Button>
      </div>
    </div>
  );
}

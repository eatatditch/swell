"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { startChecklistRun } from "@/components/checklists/actions";

interface StartRunButtonProps {
  checklistId: string;
  locationId: string;
  runDate: string;
}

export function StartRunButton({
  checklistId,
  locationId,
  runDate,
}: StartRunButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function start() {
    setError(null);
    startTransition(async () => {
      const res = await startChecklistRun({
        checklistId,
        locationId,
        runDate,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button onClick={start} disabled={pending} size="lg" className="gap-2">
        <Play className="h-4 w-4" />
        {pending ? "Starting…" : "Start run"}
      </Button>
    </div>
  );
}

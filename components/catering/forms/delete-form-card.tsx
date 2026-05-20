"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteLeadForm } from "@/components/catering/forms/actions";

interface DeleteFormCardProps {
  formId: string;
  formName: string;
  submissionCount: number;
}

export function DeleteFormCard({
  formId,
  formName,
  submissionCount,
}: DeleteFormCardProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const [typedName, setTypedName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteLeadForm(formId);
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.push("/catering/forms");
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-rose-900">Delete this form</p>
            <p className="text-xs text-rose-800/80">
              Removes the form, its embed, and all{" "}
              {submissionCount > 0
                ? `${submissionCount} submission${submissionCount === 1 ? "" : "s"}.`
                : "future submissions."}{" "}
              Existing leads stay in the pipeline but lose the link back to
              this form.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-900"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete form
          </Button>
        </div>
      </div>
    );
  }

  const confirmed = typedName.trim() === formName.trim();

  return (
    <div className="space-y-3 rounded-2xl border border-rose-300 bg-rose-50 p-4">
      <div>
        <p className="font-semibold text-rose-900">
          Confirm form deletion
        </p>
        <p className="text-xs text-rose-800/80">
          Type the form name{" "}
          <span className="font-mono font-bold">{formName}</span> to confirm.
          This can&apos;t be undone.
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm-name" className="text-rose-900">
          Form name
        </Label>
        <Input
          id="confirm-name"
          value={typedName}
          onChange={(e) => setTypedName(e.target.value)}
          placeholder={formName}
          disabled={pending}
          className="bg-white"
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setConfirming(false);
            setTypedName("");
            setError(null);
          }}
          disabled={pending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          className="gap-1.5 bg-rose-600 text-white hover:bg-rose-700"
          onClick={onDelete}
          disabled={!confirmed || pending}
        >
          <Trash2 className="h-4 w-4" />
          {pending ? "Deleting…" : "Delete permanently"}
        </Button>
      </div>
    </div>
  );
}

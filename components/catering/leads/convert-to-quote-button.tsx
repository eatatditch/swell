"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { convertLeadToQuote } from "@/components/catering/leads/actions";

interface ConvertToQuoteButtonProps {
  leadId: string;
}

export function ConvertToQuoteButton({ leadId }: ConvertToQuoteButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    startTransition(async () => {
      const res = await convertLeadToQuote({ leadId });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if ("quote" in res && res.quote) {
        router.push(`/catering/quotes/${res.quote.id}`);
        router.refresh();
      }
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={onClick}
        disabled={pending}
        className="gap-1.5"
      >
        <FileText className="h-4 w-4" />
        {pending ? "Creating…" : "Create quote"}
      </Button>
      {error ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </>
  );
}

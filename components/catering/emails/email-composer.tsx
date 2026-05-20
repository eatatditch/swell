"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Send } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { sendLeadEmail } from "@/components/catering/emails/actions";

interface EmailComposerProps {
  leadId?: string | null;
  contactId?: string | null;
  contactName: string;
  contactEmail: string;
  fromEmail: string;
  defaultSubject?: string;
  inReplyToMessageId?: string;
  threadId?: string;
  onSent?: () => void;
}

export function EmailComposer({
  leadId,
  contactId,
  contactName,
  contactEmail,
  fromEmail,
  defaultSubject,
  inReplyToMessageId,
  threadId,
  onSent,
}: EmailComposerProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState(defaultSubject ?? "");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit() {
    setError(null);
    if (!subject.trim() || !body.trim()) {
      setError("Subject and message are required");
      return;
    }
    startTransition(async () => {
      const res = await sendLeadEmail({
        leadId: leadId ?? null,
        contactId: contactId ?? null,
        to: contactEmail,
        subject: subject.trim(),
        body: body.trim(),
        inReplyToMessageId: inReplyToMessageId ?? null,
        threadId: threadId ?? null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setSubject("");
      setBody("");
      setSent(true);
      onSent?.();
      router.refresh();
      // Auto-clear the success banner after a few seconds.
      setTimeout(() => setSent(false), 3500);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-3">
      <div className="text-xs text-muted-foreground">
        From <span className="font-semibold text-foreground">{fromEmail}</span>{" "}
        to{" "}
        <span className="font-semibold text-foreground">
          {contactName} &lt;{contactEmail}&gt;
        </span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`compose-subject-${leadId ?? contactId ?? "x"}`} className="text-xs">
          Subject
        </Label>
        <Input
          id={`compose-subject-${leadId ?? contactId ?? "x"}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Following up on your catering inquiry"
          disabled={pending}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`compose-body-${leadId ?? contactId ?? "x"}`} className="text-xs">
          Message
        </Label>
        <Textarea
          id={`compose-body-${leadId ?? contactId ?? "x"}`}
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Hi Tracy,&#10;&#10;Thanks for reaching out about your event…"
          disabled={pending}
        />
      </div>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {sent ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <AlertDescription>Sent.</AlertDescription>
        </Alert>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="accent"
          size="sm"
          onClick={submit}
          disabled={pending}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {pending ? "Sending…" : "Send"}
        </Button>
      </div>
    </div>
  );
}

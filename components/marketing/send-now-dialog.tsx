"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, TestTube2, Users } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  previewAudience,
  sendNow,
  testSend,
  type PreviewAudienceResult,
} from "@/components/marketing/send-actions";

interface Props {
  contentItemId: string;
  channel: "email" | "sms";
  title: string;
  triggerLabel?: string;
}

export function SendNowDialog({
  contentItemId,
  channel,
  title,
  triggerLabel,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewAudienceResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [sendResult, setSendResult] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setPreview(null);
    setPreviewError(null);
    setTestResult(null);
    setSendResult(null);
    setConfirm(false);
    (async () => {
      const res = await previewAudience(contentItemId);
      if ("error" in res) setPreviewError(res.error);
      else setPreview(res);
    })();
  }, [open, contentItemId]);

  function doTest() {
    if (!testTo.trim()) {
      setTestResult("Enter a recipient.");
      return;
    }
    startTransition(async () => {
      const res = await testSend({
        id: contentItemId,
        recipient: testTo.trim(),
      });
      if ("error" in res) {
        setTestResult(`Failed: ${res.error}`);
        return;
      }
      if (res.failed > 0) {
        setTestResult(`Failed: ${res.errors.join(", ")}`);
      } else {
        setTestResult(`Test sent to ${testTo.trim()}.`);
      }
    });
  }

  function doSend() {
    setSendResult(null);
    startTransition(async () => {
      const res = await sendNow({ id: contentItemId });
      if ("error" in res) {
        setSendResult(`Failed: ${res.error}`);
        return;
      }
      setSendResult(
        `Sent: ${res.succeeded} succeeded · ${res.failed} failed · ${res.attempted} attempted.${res.errors.length > 0 ? " Errors: " + res.errors.join("; ") : ""}`,
      );
      router.refresh();
    });
  }

  const total = preview?.total ?? null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="accent"
          size="sm"
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" /> {triggerLabel ?? "Send"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send {channel === "sms" ? "SMS" : "email"}</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border bg-muted/40 p-3">
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-accent" />
              <span className="font-semibold">Audience</span>
            </div>
            {previewError ? (
              <Alert variant="destructive" className="mt-2">
                <AlertDescription>{previewError}</AlertDescription>
              </Alert>
            ) : preview ? (
              <div className="mt-2 text-sm">
                <p>
                  <span className="text-2xl font-semibold tabular-nums">
                    {total}
                  </span>{" "}
                  <span className="text-muted-foreground">
                    {channel === "email" ? "emailable" : "textable"} subscriber
                    {total === 1 ? "" : "s"}
                  </span>
                </p>
                {preview.tags.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Targeting <strong>everyone</strong> with{" "}
                    {channel === "email" ? "email" : "SMS"} opt-in.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Targeting tags:{" "}
                    {preview.tags.map((t) => (
                      <span
                        key={t}
                        className="ml-0.5 inline-block rounded-full bg-accent/15 px-1.5 py-0.5 font-medium text-accent"
                      >
                        {t}
                      </span>
                    ))}
                  </p>
                )}
                {preview.sampleNames.length > 0 ? (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    First few: {preview.sampleNames.join(", ")}
                    {preview.total > preview.sampleNames.length ? "…" : ""}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Counting…</p>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <div className="mb-2 flex items-center gap-2 text-sm">
              <TestTube2 className="h-4 w-4 text-accent" />
              <span className="font-semibold">Test first</span>
            </div>
            <div className="flex gap-2">
              <Input
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
                placeholder={
                  channel === "email" ? "you@example.com" : "+15555555555"
                }
              />
              <Button
                variant="outline"
                size="sm"
                onClick={doTest}
                disabled={pending || !testTo.trim()}
              >
                Send test
              </Button>
            </div>
            {testResult ? (
              <p className="mt-2 text-xs text-muted-foreground">{testResult}</p>
            ) : null}
          </div>

          {sendResult ? (
            <Alert>
              <AlertDescription>{sendResult}</AlertDescription>
            </Alert>
          ) : null}

          <Alert className="border-amber-500/40 bg-amber-500/5">
            <AlertDescription className="text-amber-700">
              This sends to <strong>{total ?? "?"} real {channel === "email" ? "email addresses" : "phone numbers"}</strong>. There&apos;s no undo.
            </AlertDescription>
          </Alert>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={confirm}
              onChange={(e) => setConfirm(e.target.checked)}
              className="h-4 w-4"
            />
            I&apos;m sending this to the audience above.
          </label>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button
            variant="accent"
            onClick={doSend}
            disabled={pending || !confirm || !total}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            {pending ? "Sending…" : `Send to ${total ?? 0}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

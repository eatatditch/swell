"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stamp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signOffCourse } from "@/components/training/actions";
import type { SignoffRequest } from "@/lib/server/training";

function initials(name: string | null, email: string | null) {
  const s = (name ?? email ?? "·").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export function SignoffQueue({ requests }: { requests: SignoffRequest[] }) {
  return (
    <ul className="space-y-2">
      {requests.map((r) => (
        <SignoffRow key={`${r.user.id}-${r.course.id}`} req={r} />
      ))}
    </ul>
  );
}

function SignoffRow({ req }: { req: SignoffRequest }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sign() {
    setError(null);
    startTransition(async () => {
      const res = await signOffCourse({
        userId: req.user.id,
        courseId: req.course.id,
        notes: notes || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start gap-3">
        <Avatar className="h-8 w-8">
          {req.user.avatar_url ? (
            <AvatarImage src={req.user.avatar_url} alt="" />
          ) : null}
          <AvatarFallback className="text-[10px]">
            {initials(req.user.full_name, req.user.email)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {req.user.full_name ?? req.user.email ?? "—"}
            <span className="ml-1 text-sm text-muted-foreground">
              · {req.course.title}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">
            Finished {req.lessonCount} lesson
            {req.lessonCount === 1 ? "" : "s"} ·{" "}
            {new Date(req.lastCompletedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes — what you observed"
          className="flex-1 min-w-[200px]"
          disabled={pending}
        />
        <Button
          variant="accent"
          size="sm"
          onClick={sign}
          disabled={pending}
          className="gap-1.5"
        >
          <Stamp className="h-4 w-4" />
          {pending ? "Signing…" : "Sign off"}
        </Button>
      </div>
      {error ? (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </li>
  );
}

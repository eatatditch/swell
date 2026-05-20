"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCircle2, Phone, Mail, Trash2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/data/empty-state";
import {
  completeFollowup,
  createFollowup,
  deleteFollowup,
} from "@/components/catering/followups/actions";
import {
  FOLLOWUP_KINDS,
  FOLLOWUP_KIND_LABELS,
} from "@/lib/constants/catering";
import { cn } from "@/lib/utils";
import type {
  CateringFollowupKind,
  ProfileLite,
} from "@/lib/types/database";
import type { FollowupWithAssignee } from "@/lib/server/catering";

interface FollowupListProps {
  leadId: string;
  followups: FollowupWithAssignee[];
  currentUserId: string;
  teamProfiles?: Pick<ProfileLite, "id" | "full_name" | "email">[];
}

const KIND_ICONS = {
  call: Phone,
  email: Mail,
  task: CheckCircle2,
};

export function FollowupList({
  leadId,
  followups,
  currentUserId,
  teamProfiles,
}: FollowupListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [kind, setKind] = useState<CateringFollowupKind>("task");
  const [body, setBody] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");

  function submit() {
    setError(null);
    if (!body.trim()) {
      setError("Add a description");
      return;
    }
    startTransition(async () => {
      const res = await createFollowup({
        leadId,
        kind,
        body,
        dueAt: dueAt || null,
        assignedTo: assignedTo || null,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setBody("");
      setDueAt("");
      router.refresh();
    });
  }

  function toggle(id: string, done: boolean) {
    startTransition(async () => {
      await completeFollowup(id, done);
      router.refresh();
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      await deleteFollowup(id);
      router.refresh();
    });
  }

  const open = followups.filter((f) => !f.done_at);
  const done = followups.filter((f) => f.done_at);

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <p className="text-sm font-medium">Add a follow-up</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="fu-kind">Kind</Label>
            <select
              id="fu-kind"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as CateringFollowupKind)
              }
              disabled={pending}
            >
              {FOLLOWUP_KINDS.map((k) => (
                <option key={k} value={k}>
                  {FOLLOWUP_KIND_LABELS[k]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-due">Due</Label>
            <Input
              id="fu-due"
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              disabled={pending}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="fu-assignee">Assign to</Label>
            <select
              id="fu-assignee"
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm"
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              disabled={pending}
            >
              <option value="">— Lead owner —</option>
              {teamProfiles?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.full_name ?? p.email}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fu-body">What needs to happen?</Label>
          <Textarea
            id="fu-body"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Send proposal v2, call to confirm headcount…"
            disabled={pending}
          />
        </div>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="accent"
            onClick={submit}
            disabled={pending || !body.trim()}
          >
            {pending ? "Saving…" : "Add follow-up"}
          </Button>
        </div>
      </div>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No follow-ups yet"
          description="Add reminders so this lead doesn't fall through the cracks."
        />
      ) : (
        <div className="space-y-4">
          {open.length > 0 ? (
            <Section title="Open">
              <ul className="space-y-2">
                {open.map((f) => (
                  <Row
                    key={f.id}
                    followup={f}
                    currentUserId={currentUserId}
                    onToggle={toggle}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </Section>
          ) : null}
          {done.length > 0 ? (
            <Section title="Completed">
              <ul className="space-y-2">
                {done.map((f) => (
                  <Row
                    key={f.id}
                    followup={f}
                    currentUserId={currentUserId}
                    onToggle={toggle}
                    onRemove={remove}
                  />
                ))}
              </ul>
            </Section>
          ) : null}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Row({
  followup,
  currentUserId,
  onToggle,
  onRemove,
}: {
  followup: FollowupWithAssignee;
  currentUserId: string;
  onToggle: (id: string, done: boolean) => void;
  onRemove: (id: string) => void;
}) {
  const Icon = KIND_ICONS[followup.kind];
  const overdue =
    !followup.done_at &&
    followup.due_at &&
    new Date(followup.due_at).getTime() < Date.now();
  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-card p-3 sm:flex-row sm:items-start sm:gap-3",
        followup.done_at && "opacity-70",
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(followup.id, !followup.done_at)}
        aria-label={followup.done_at ? "Mark not done" : "Mark done"}
        className={cn(
          "mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
          followup.done_at
            ? "border-primary bg-primary text-primary-foreground"
            : "border-input bg-background hover:border-primary",
        )}
      >
        {followup.done_at ? <CheckCircle2 className="h-3 w-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs">
            <Icon className="h-3 w-3" />
            {FOLLOWUP_KIND_LABELS[followup.kind]}
          </span>
          {followup.due_at ? (
            <span
              className={cn(
                "text-xs tabular-nums",
                overdue
                  ? "text-amber-700 dark:text-amber-300"
                  : "text-muted-foreground",
              )}
            >
              Due {formatDateTime(followup.due_at)}
            </span>
          ) : null}
        </div>
        <p
          className={cn(
            "mt-1 whitespace-pre-wrap text-sm",
            followup.done_at && "line-through",
          )}
        >
          {followup.body}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {followup.assignee
            ? `Assigned to ${followup.assignee.full_name ?? followup.assignee.email}`
            : "Unassigned"}
          {followup.done_at
            ? ` · done ${formatDateTime(followup.done_at)}`
            : null}
        </p>
      </div>
      {followup.created_by === currentUserId ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(followup.id)}
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          aria-label="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ) : null}
    </li>
  );
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

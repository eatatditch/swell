"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { kioskSignIn } from "@/app/(kiosk)/learn/kiosk/actions";
import { TRAINING_STAFF_TYPE_SHORT } from "@/lib/constants/training";
import type { KioskNamePickEntry } from "@/lib/server/training-staff";

interface Props {
  roster: KioskNamePickEntry[];
}

export function KioskSignInForm({ roster }: Props) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [staffId, setStaffId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return roster;
    return roster.filter((s) => s.full_name.toLowerCase().includes(q));
  }, [roster, filter]);

  const selectedStaff = roster.find((s) => s.id === staffId);

  function submit() {
    setError(null);
    if (!staffId) {
      setError("Pick your name from the list.");
      return;
    }
    if (!/^\d{4,6}$/.test(pin)) {
      setError("Enter your 4–6 digit PIN.");
      return;
    }
    startTransition(async () => {
      const res = await kioskSignIn({ staffId, pin });
      if ("error" in res) {
        setError(res.error);
        setPin("");
        return;
      }
      router.replace("/learn");
      router.refresh();
    });
  }

  if (roster.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No staff have been added yet. Ask a manager to add you under
          Admin → Surf School → Staff.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border bg-card p-5">
      {!selectedStaff ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="filter">Find your name</Label>
            <Input
              id="filter"
              autoFocus
              placeholder="Start typing…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-2 py-3 text-sm text-muted-foreground">
                No matches.
              </li>
            ) : (
              filtered.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setStaffId(s.id);
                      setError(null);
                    }}
                    className="flex w-full items-center justify-between rounded-lg border bg-background px-3 py-2 text-left text-sm hover:bg-muted"
                  >
                    <span className="font-medium">{s.full_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {TRAINING_STAFF_TYPE_SHORT[s.staff_type]}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{selectedStaff.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {TRAINING_STAFF_TYPE_SHORT[selectedStaff.staff_type]}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setStaffId("");
                  setPin("");
                  setError(null);
                }}
                className="text-xs font-semibold text-muted-foreground underline"
              >
                Change
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              inputMode="numeric"
              autoFocus
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
              placeholder="••••"
            />
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          <Button
            className="w-full"
            variant="accent"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </div>
      )}
    </div>
  );
}

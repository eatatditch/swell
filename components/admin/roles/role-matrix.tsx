"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Loader2, RotateCcw, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  resetRoleAccessAction,
  toggleRoleAccessAction,
} from "@/components/admin/roles/actions";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";
import type { Role } from "@/lib/types/database";

interface ModuleEntry {
  slug: string;
  label: string;
}

interface RoleMatrixProps {
  modules: ModuleEntry[];
  matrix: Record<Role, Record<string, boolean>>;
  overrideKeys: Set<string>;
}

export function RoleMatrix({
  modules,
  matrix: initialMatrix,
  overrideKeys: initialOverrides,
}: RoleMatrixProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyCell, setBusyCell] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matrix, setMatrix] = useState(initialMatrix);
  const [overrides, setOverrides] = useState(initialOverrides);

  function toggle(role: Role, moduleSlug: string) {
    const key = `${role}::${moduleSlug}`;
    const current = matrix[role][moduleSlug];
    setBusyCell(key);
    setError(null);

    // Optimistic flip.
    setMatrix((m) => ({
      ...m,
      [role]: { ...m[role], [moduleSlug]: !current },
    }));

    startTransition(async () => {
      const res = await toggleRoleAccessAction({
        role,
        moduleSlug,
        isVisible: !current,
      });
      setBusyCell(null);
      if ("error" in res) {
        // Roll back.
        setMatrix((m) => ({
          ...m,
          [role]: { ...m[role], [moduleSlug]: current },
        }));
        setError(res.error);
        return;
      }
      // Refresh from the server to pick up the override-vs-default state.
      router.refresh();
    });
  }

  function reset() {
    if (
      !confirm(
        "Reset every role × module override back to the built-in defaults?",
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await resetRoleAccessAction();
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setOverrides(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>
          Click any cell to flip access. <span className="text-foreground">●</span>{" "}
          means the role sees the module; <span>○</span> means hidden.
          A small dot under a cell means the value differs from the built-in
          default.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5"
          onClick={reset}
          disabled={pending || overrides.size === 0}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset to defaults
        </Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background py-2 pr-4 font-medium text-muted-foreground">
                Module
              </th>
              {ROLES.map((r) => (
                <th
                  key={r}
                  className="px-2 py-2 text-center font-medium text-muted-foreground"
                >
                  {ROLE_LABELS[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {modules.map((m) => (
              <tr key={m.slug} className="border-b last:border-0">
                <td className="sticky left-0 z-10 bg-background border-t py-2 pr-4 font-medium">
                  {m.label}
                </td>
                {ROLES.map((r) => {
                  const key = `${r}::${m.slug}`;
                  const visible = matrix[r][m.slug];
                  const overridden = overrides.has(key);
                  const busy = busyCell === key;
                  const locked =
                    r === "founder_admin" &&
                    (m.slug === "admin" || m.slug === "dashboard");
                  return (
                    <td
                      key={r}
                      className="border-t px-2 py-1.5 text-center"
                    >
                      <button
                        type="button"
                        onClick={() => !locked && toggle(r, m.slug)}
                        disabled={pending || locked}
                        aria-label={`${visible ? "Hide" : "Show"} ${m.label} for ${ROLE_LABELS[r]}`}
                        className={cn(
                          "group relative inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                          visible
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-border bg-muted/40 text-muted-foreground hover:bg-muted",
                          locked && "cursor-not-allowed opacity-70",
                          (pending || busy) && "cursor-wait",
                        )}
                      >
                        {busy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : visible ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                        {overridden ? (
                          <span className="absolute -bottom-1 right-0.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        ) : null}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

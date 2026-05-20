"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Award, ExternalLink, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/data/empty-state";
import { deleteCertification } from "@/components/training/actions";
import { expiryBucket } from "@/lib/constants/training";
import { cn } from "@/lib/utils";
import type { Certification } from "@/lib/types/database";

interface CertificationListProps {
  certifications: Certification[];
  canManage: boolean;
}

export function CertificationList({
  certifications,
  canManage,
}: CertificationListProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function remove(id: string) {
    startTransition(async () => {
      await deleteCertification(id);
      router.refresh();
    });
  }

  if (certifications.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No certifications"
        description={
          canManage
            ? "Add Food Handler, ServSafe, TIPS, or any credential."
            : "Your manager will add credentials here as you earn them."
        }
      />
    );
  }

  return (
    <ul className="space-y-2">
      {certifications.map((c) => {
        const bucket = expiryBucket(c.expires_on);
        return (
          <li
            key={c.id}
            className="rounded-lg border bg-card p-3"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-accent">
                <Award className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {c.kind}
                  {c.issuing_body ? ` · ${c.issuing_body}` : ""}
                  {` · issued ${c.issued_on}`}
                </p>
                {bucket ? (
                  <p
                    className={cn(
                      "mt-0.5 text-xs",
                      bucket.tone === "overdue" && "text-rose-600",
                      bucket.tone === "soon" && "text-amber-600",
                      bucket.tone === "ok" && "text-muted-foreground",
                    )}
                  >
                    {bucket.label}
                  </p>
                ) : null}
                {c.document_url ? (
                  <a
                    href={c.document_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-accent underline-offset-2 hover:underline"
                  >
                    Open document <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
              {canManage ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(c.id)}
                  disabled={pending}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

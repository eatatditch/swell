import Link from "next/link";

import type { LeadFormSubmission } from "@/lib/types/database";

export function SubmissionsList({
  submissions,
}: {
  submissions: LeadFormSubmission[];
}) {
  if (submissions.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-border bg-muted/30 p-6 text-sm text-muted-foreground">
        No submissions yet. Once a guest fills out the form, you&apos;ll see
        them here and as new leads in the pipeline.
      </p>
    );
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-3 py-2">When</th>
            <th className="px-3 py-2">Preview</th>
            <th className="px-3 py-2">Lead</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s) => (
            <tr key={s.id} className="border-b border-border last:border-b-0">
              <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">
                {new Date(s.created_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-xs">
                <SubmissionPreview payload={s.payload} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-xs">
                {s.lead_id ? (
                  <Link
                    href={`/catering/leads/${s.lead_id}`}
                    className="text-accent underline-offset-2 hover:underline"
                  >
                    Open lead →
                  </Link>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubmissionPreview({
  payload,
}: {
  payload: Record<string, unknown>;
}) {
  const entries = Object.entries(payload).filter(
    ([, v]) => v !== "" && v !== null && v !== undefined,
  );
  if (entries.length === 0) return <span>(empty)</span>;
  // Show first 3 fields as "key: value" pairs.
  return (
    <div className="space-y-0.5">
      {entries.slice(0, 3).map(([k, v]) => (
        <div key={k}>
          <span className="text-muted-foreground">{k}: </span>
          <span>{Array.isArray(v) ? v.join(", ") : String(v)}</span>
        </div>
      ))}
      {entries.length > 3 ? (
        <div className="text-[11px] text-muted-foreground">
          +{entries.length - 3} more field{entries.length - 3 === 1 ? "" : "s"}
        </div>
      ) : null}
    </div>
  );
}

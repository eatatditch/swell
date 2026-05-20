import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { FormBuilder } from "@/components/catering/forms/form-builder";
import { EmbedSnippet } from "@/components/catering/forms/embed-snippet";
import { SubmissionsList } from "@/components/catering/forms/submissions-list";
import { DeleteFormCard } from "@/components/catering/forms/delete-form-card";
import { getLeadFormById, listFormSubmissions } from "@/lib/server/lead-forms";
import { appUrl } from "@/lib/stripe/client";

interface PageProps {
  params: { id: string };
}

export default async function CateringFormDetailPage({ params }: PageProps) {
  const form = await getLeadFormById(params.id);
  if (!form) notFound();
  const submissions = await listFormSubmissions({ formId: form.id });
  const host = appUrl().replace(/\/$/, "");

  return (
    <>
      <PageHeader
        title={form.name}
        description={
          <>
            <Link
              href="/catering/forms"
              className="text-accent underline-offset-2 hover:underline"
            >
              ← All forms
            </Link>
            {" · "}
            {form.location?.name ?? "—"} · {form.submission_count} submission
            {form.submission_count === 1 ? "" : "s"}
          </>
        }
      />

      <div className="space-y-6">
        <FormBuilder form={form} appUrl={host} />

        <EmbedSnippet slug={form.slug} appUrl={host} />

        <section className="space-y-2">
          <h2 className="font-display text-xl font-bold">Recent submissions</h2>
          <SubmissionsList submissions={submissions} />
        </section>

        <DeleteFormCard
          formId={form.id}
          formName={form.name}
          submissionCount={form.submission_count}
        />
      </div>
    </>
  );
}

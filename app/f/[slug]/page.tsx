import { notFound } from "next/navigation";

import { PublicForm } from "@/components/forms/public-form";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type {
  FormSchema,
  FormSettings,
  LeadForm,
} from "@/lib/types/database";

interface PageProps {
  params: { slug: string };
  searchParams: { embed?: string };
}

export const dynamic = "force-dynamic";

export default async function PublicFormPage({
  params,
  searchParams,
}: PageProps) {
  const admin = createSupabaseAdminClient();
  const { data } = await admin
    .from("lead_forms")
    .select("id, slug, name, description, schema, settings, active")
    .ilike("slug", params.slug)
    .maybeSingle();

  if (!data) notFound();

  const form = data as Pick<
    LeadForm,
    "id" | "slug" | "name" | "description" | "schema" | "settings" | "active"
  >;
  const embed = searchParams.embed === "1";

  return (
    <main
      className={
        embed
          ? "bg-transparent px-4 py-6"
          : "min-h-screen bg-background px-4 py-12"
      }
    >
      <div className={embed ? "mx-auto max-w-2xl" : "mx-auto max-w-2xl"}>
        {!embed ? (
          <header className="mb-8 text-center">
            <h1 className="font-display text-4xl font-black tracking-tight">
              {form.name}
            </h1>
            {form.description ? (
              <p className="mt-3 text-base text-muted-foreground">
                {form.description}
              </p>
            ) : null}
          </header>
        ) : null}

        {form.active ? (
          <PublicForm
            slug={form.slug}
            schema={form.schema as FormSchema}
            settings={form.settings as FormSettings}
            embed={embed}
          />
        ) : (
          <p className="rounded-2xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            This form is no longer accepting submissions.
          </p>
        )}
      </div>
    </main>
  );
}

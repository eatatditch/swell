import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChecklistTemplateEditor } from "@/components/checklists/checklist-template-editor";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/get-user";
import type { Checklist, ChecklistItem } from "@/lib/types/database";

interface PageProps {
  params: { id: string };
}

export default async function EditChecklistTemplatePage({ params }: PageProps) {
  const { profile, locations } = await requireUser();

  if (profile.role !== "founder_admin" && profile.role !== "general_manager") {
    redirect(`/daily-ops/checklists/${params.id}`);
  }

  const supabase = createSupabaseServerClient();
  const { data: template } = await supabase
    .from("checklists")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (!template) notFound();

  const { data: items } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("checklist_id", params.id)
    .order("position");

  return (
    <>
      <PageHeader
        title={`Edit: ${(template as Checklist).name}`}
        description="Change line items, ordering, or notes required."
      />
      <Card>
        <CardContent className="pt-6">
          <ChecklistTemplateEditor
            mode="edit"
            template={template as Checklist}
            items={(items ?? []) as ChecklistItem[]}
            locations={locations}
          />
        </CardContent>
      </Card>
    </>
  );
}

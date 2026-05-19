import { redirect } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChecklistTemplateEditor } from "@/components/checklists/checklist-template-editor";
import { requireUser } from "@/lib/auth/get-user";

export default async function NewChecklistTemplatePage() {
  const { profile, locations } = await requireUser();

  if (profile.role !== "founder_admin" && profile.role !== "general_manager") {
    redirect("/daily-ops/checklists");
  }

  return (
    <>
      <PageHeader
        title="New checklist template"
        description="Build the steps the team will run."
      />
      <Card>
        <CardContent className="pt-6">
          <ChecklistTemplateEditor mode="create" locations={locations} />
        </CardContent>
      </Card>
    </>
  );
}

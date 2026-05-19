import type { LucideIcon } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { PageHeader } from "@/components/layout/page-header";

interface ModuleShellProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription?: string;
}

export function ModuleShell({
  title,
  description,
  icon,
  emptyTitle,
  emptyDescription,
}: ModuleShellProps) {
  return (
    <>
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDescription}
      />
    </>
  );
}

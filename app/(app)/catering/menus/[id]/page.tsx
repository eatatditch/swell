import { notFound } from "next/navigation";
import Link from "next/link";
import { Archive } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MenuBuilder } from "@/components/catering/menus/menu-builder";
import { ArchiveMenuButton } from "@/components/catering/menus/archive-menu-button";
import { requireUser } from "@/lib/auth/get-user";
import { getMenuFull } from "@/lib/server/catering-menus";
import { SERVICE_TYPE_LABELS } from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

export default async function MenuDetailPage({ params }: PageProps) {
  await requireUser();
  const menu = await getMenuFull(params.id);
  if (!menu) notFound();

  const totalItems = menu.sections.reduce((n, s) => n + s.items.length, 0);

  return (
    <>
      <PageHeader
        title={menu.name}
        description={
          menu.description
            ? `${SERVICE_TYPE_LABELS[menu.default_service_type]} · ${menu.description}`
            : SERVICE_TYPE_LABELS[menu.default_service_type]
        }
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/catering/menus/${menu.id}/edit`}>Edit details</Link>
            </Button>
            <ArchiveMenuButton menuId={menu.id} archived={menu.is_archived} />
          </div>
        }
      />

      {menu.is_archived ? (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          <Archive className="h-4 w-4" />
          This menu is archived. It won&apos;t show on quotes by default.
        </div>
      ) : null}

      <p className="mb-3 text-xs text-muted-foreground">
        {menu.sections.length} section
        {menu.sections.length === 1 ? "" : "s"} · {totalItems} item
        {totalItems === 1 ? "" : "s"}
      </p>

      <MenuBuilder menu={menu} />
    </>
  );
}

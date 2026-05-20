import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { MenuList } from "@/components/catering/menus/menu-list";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";
import { listMenus } from "@/lib/server/catering-menus";

interface PageProps {
  searchParams: { archived?: string };
}

export default async function CateringMenusPage({ searchParams }: PageProps) {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);
  const includeArchived = searchParams.archived === "1";

  const menus = await listMenus({
    locationId: active?.id ?? null,
    includeArchived,
  });

  return (
    <>
      <PageHeader
        title="Menus"
        description="Reusable catering menus. Build once, attach to quotes and events."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  includeArchived ? "/catering/menus" : "/catering/menus?archived=1"
                }
              >
                {includeArchived ? "Hide archived" : "Show archived"}
              </Link>
            </Button>
            <Button asChild variant="accent" size="sm" className="gap-1.5">
              <Link href="/catering/menus/new">
                <Plus className="h-4 w-4" />
                New menu
              </Link>
            </Button>
          </div>
        }
      />

      <MenuList menus={menus} />
    </>
  );
}

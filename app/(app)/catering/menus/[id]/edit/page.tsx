import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { MenuForm } from "@/components/catering/menus/menu-form";
import { requireUser } from "@/lib/auth/get-user";
import { getMenuFull } from "@/lib/server/catering-menus";

interface PageProps {
  params: { id: string };
}

export default async function EditMenuPage({ params }: PageProps) {
  const { locations } = await requireUser();
  const menu = await getMenuFull(params.id);
  if (!menu) notFound();

  return (
    <>
      <PageHeader
        title={`Edit · ${menu.name}`}
        description="Update menu metadata."
      />
      <MenuForm locations={locations} menu={menu} />
    </>
  );
}

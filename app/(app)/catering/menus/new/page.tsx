import { PageHeader } from "@/components/layout/page-header";
import { MenuForm } from "@/components/catering/menus/menu-form";
import { requireUser } from "@/lib/auth/get-user";
import { resolveActiveLocation } from "@/lib/auth/active-location";

export default async function NewMenuPage() {
  const { locations } = await requireUser();
  const active = resolveActiveLocation(locations);

  return (
    <>
      <PageHeader
        title="New menu"
        description="Set up the metadata first — you can add sections and items afterward."
      />
      <MenuForm locations={locations} defaultLocationId={active?.id ?? null} />
    </>
  );
}

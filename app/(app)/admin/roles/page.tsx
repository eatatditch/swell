import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RoleMatrix } from "@/components/admin/roles/role-matrix";
import { requireAdmin } from "@/lib/auth/get-user";
import { MODULES } from "@/lib/constants/modules";
import { resolveAccess } from "@/lib/server/role-access";

export default async function AdminRolesPage() {
  await requireAdmin();
  const { matrix, overrides } = await resolveAccess();
  const modules = MODULES.map((m) => ({ slug: m.slug, label: m.label }));
  const overrideKeys = new Set(
    overrides.map((o) => `${o.role}::${o.module_slug}`),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>
          Module × role visibility. Toggles take effect immediately for new
          page loads.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RoleMatrix
          modules={modules}
          matrix={matrix}
          overrideKeys={overrideKeys}
        />
      </CardContent>
    </Card>
  );
}

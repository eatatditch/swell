import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MODULES } from "@/lib/constants/modules";
import { ROLE_LABELS, ROLES } from "@/lib/constants/roles";

export default function AdminRolesPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Roles</CardTitle>
        <CardDescription>
          Read-only view of the role × module visibility matrix from
          ROLE_PERMISSIONS.md. Editing roles arrives in Phase 12.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-muted-foreground">
                <th className="py-2 pr-4 font-medium">Module</th>
                {ROLES.map((r) => (
                  <th key={r} className="px-2 py-2 font-medium">
                    {ROLE_LABELS[r]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map((m) => (
                <tr key={m.slug} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{m.label}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-2 py-2">
                      {m.visibleTo.includes(r) ? (
                        <span aria-label="visible">●</span>
                      ) : (
                        <span
                          aria-label="hidden"
                          className="text-muted-foreground/40"
                        >
                          ○
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

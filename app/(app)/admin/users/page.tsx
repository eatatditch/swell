import { Users } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-user";
import { ROLE_LABELS } from "@/lib/constants/roles";
import type { Profile } from "@/lib/types/database";

export default async function AdminUsersPage() {
  await requireAdmin();
  const supabase = createSupabaseServerClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  const rows = (profiles ?? []) as Profile[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Users</CardTitle>
        <CardDescription>
          All profiles. Invite, role assignment, and location assignment land
          in Phase 12. For now, manage via Supabase Studio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="The first user is created on first sign-up. Promote them to founder_admin in Supabase Studio."
          />
        ) : (
          <div className="divide-y rounded-md border">
            {rows.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.full_name ?? p.email ?? p.id}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={p.is_active ? "secondary" : "outline"}>
                    {ROLE_LABELS[p.role]}
                  </Badge>
                  {!p.is_active ? (
                    <Badge variant="destructive">Inactive</Badge>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

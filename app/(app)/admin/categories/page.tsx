import { Tags } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/data/empty-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-user";
import type { Category } from "@/lib/types/database";

export default async function AdminCategoriesPage() {
  await requireAdmin();

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("module")
    .order("sort_order");

  const rows = (data ?? []) as Category[];
  const byModule = rows.reduce<Record<string, Category[]>>((acc, c) => {
    (acc[c.module] ??= []).push(c);
    return acc;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Generic taxonomy. Modules tag rows with categories scoped to that
          module. Editing arrives in Phase 12; seed via SQL for now.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={Tags}
            title="No categories yet"
            description="Modules will seed categories as they ship in their phases."
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(byModule).map(([module, cats]) => (
              <div key={module}>
                <h3 className="mb-2 text-sm font-semibold capitalize text-muted-foreground">
                  {module}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {cats.map((c) => (
                    <Badge key={c.id} variant="secondary">
                      {c.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

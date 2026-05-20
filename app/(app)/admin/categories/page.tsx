import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CategoryManager } from "@/components/admin/categories/category-manager";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/get-user";
import { MODULES } from "@/lib/constants/modules";
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

  const modules = MODULES.filter((m) => m.slug !== "admin").map((m) => ({
    slug: m.slug,
    label: m.label,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categories</CardTitle>
        <CardDescription>
          Generic taxonomy. Modules tag rows with categories scoped to that
          module — pick what shows up in dropdowns.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CategoryManager modules={modules} byModule={byModule} />
      </CardContent>
    </Card>
  );
}

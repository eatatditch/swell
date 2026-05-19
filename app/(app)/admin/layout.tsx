import { AdminTabs } from "@/components/layout/admin-tabs";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdmin } from "@/lib/auth/get-user";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();

  return (
    <>
      <PageHeader
        title="Admin"
        description="Users, roles, locations, and system settings."
      />
      <AdminTabs />
      {children}
    </>
  );
}

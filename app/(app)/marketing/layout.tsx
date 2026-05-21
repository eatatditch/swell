import { redirect } from "next/navigation";

import { MarketingSideNav } from "@/components/marketing/marketing-side-nav";
import { requireUser } from "@/lib/auth/get-user";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireUser();
  const allowed =
    profile.role === "founder_admin" ||
    profile.role === "general_manager" ||
    profile.role === "marketing_manager" ||
    profile.role === "catering_manager";
  if (!allowed) redirect("/dashboard");

  return (
    <div className="grid gap-6 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-6 lg:h-fit">
        <MarketingSideNav />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

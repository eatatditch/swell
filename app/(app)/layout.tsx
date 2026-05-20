import { cookies } from "next/headers";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireUser } from "@/lib/auth/get-user";
import { ACTIVE_LOCATION_COOKIE } from "@/app/(app)/constants";
import { countUnreadForCurrentUser } from "@/lib/server/inbox";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, locations } = await requireUser();
  const unreadMail = await countUnreadForCurrentUser();

  const cookieStore = cookies();
  const stored = cookieStore.get(ACTIVE_LOCATION_COOKIE)?.value ?? null;
  const validActive =
    stored && locations.some((l) => l.id === stored) ? stored : null;

  // If only one location is available, force-pick it so downstream pages
  // can rely on activeLocationId being set when applicable.
  const activeLocationId =
    validActive ?? (locations.length === 1 ? locations[0].id : null);

  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar
        role={profile.role}
        navBadges={{ "/catering/mail": unreadMail }}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          profile={profile}
          locations={locations}
          activeLocationId={activeLocationId}
        />
        <main className="flex-1 px-4 py-8 md:px-8">{children}</main>
      </div>
    </div>
  );
}

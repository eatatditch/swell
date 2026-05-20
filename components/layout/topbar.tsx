import { LocationSwitcher } from "@/components/layout/location-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { UserMenu } from "@/components/layout/user-menu";
import { getRecentNotifications } from "@/lib/server/queries";
import type { Location, Profile } from "@/lib/types/database";

interface TopbarProps {
  profile: Profile;
  locations: Location[];
  activeLocationId: string | null;
}

export async function Topbar({
  profile,
  locations,
  activeLocationId,
}: TopbarProps) {
  const { items, unread } = await getRecentNotifications(profile.id);

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      <MobileNav role={profile.role} />
      <div className="ml-auto flex items-center gap-2">
        <LocationSwitcher
          locations={locations}
          activeLocationId={activeLocationId}
        />
        <NotificationBell notifications={items} unreadCount={unread} />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}

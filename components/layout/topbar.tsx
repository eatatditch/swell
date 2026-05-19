import { LocationSwitcher } from "@/components/layout/location-switcher";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import type { Location, Profile } from "@/lib/types/database";

interface TopbarProps {
  profile: Profile;
  locations: Location[];
  activeLocationId: string | null;
}

export function Topbar({ profile, locations, activeLocationId }: TopbarProps) {
  return (
    <header className="flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-6">
      <MobileNav role={profile.role} />
      <div className="ml-auto flex items-center gap-2">
        <LocationSwitcher
          locations={locations}
          activeLocationId={activeLocationId}
        />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}

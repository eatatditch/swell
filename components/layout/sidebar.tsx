import Link from "next/link";
import { Waves } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/lib/types/database";

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold tracking-tight">SWELL</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav role={role} />
      </div>
      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        Ditch internal OS
      </div>
    </aside>
  );
}

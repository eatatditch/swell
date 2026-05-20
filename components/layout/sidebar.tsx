import Link from "next/link";
import { Waves } from "lucide-react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { Role } from "@/lib/types/database";

interface SidebarProps {
  role: Role;
}

export function Sidebar({ role }: SidebarProps) {
  return (
    <aside className="hidden h-screen w-60 shrink-0 flex-col bg-primary text-primary-foreground md:flex">
      <div className="flex h-16 items-center gap-2 border-b border-primary-foreground/10 px-5">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Waves className="h-5 w-5 text-accent" />
          <span className="font-display text-xl font-black tracking-tight">
            SWELL
          </span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SidebarNav role={role} />
      </div>
      <div className="border-t border-primary-foreground/10 px-5 py-3 text-xs text-primary-foreground/60">
        Ditch internal OS
      </div>
    </aside>
  );
}

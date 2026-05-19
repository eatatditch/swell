"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { modulesForRole } from "@/lib/constants/modules";
import type { Role } from "@/lib/types/database";

interface SidebarNavProps {
  role: Role;
  onNavigate?: () => void;
}

export function SidebarNav({ role, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const items = modulesForRole(role);

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <div key={item.slug}>
            <Link
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
            {active && item.subNav ? (
              <ul className="ml-7 mt-1 flex flex-col gap-0.5 border-l pl-3">
                {item.subNav.map((s) => {
                  const subActive =
                    pathname === s.href ||
                    (s.href !== item.href && pathname.startsWith(`${s.href}/`));
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        onClick={onNavigate}
                        className={cn(
                          "block rounded-md px-2 py-1 text-xs transition-colors",
                          subActive
                            ? "font-medium text-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {s.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

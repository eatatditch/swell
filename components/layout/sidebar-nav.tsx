"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { modulesForRole } from "@/lib/constants/modules";
import type { Role } from "@/lib/types/database";

interface SidebarNavProps {
  role: Role;
  onNavigate?: () => void;
  navBadges?: Record<string, number>;
}

export function SidebarNav({ role, onNavigate, navBadges }: SidebarNavProps) {
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
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                active
                  ? "bg-accent/15 text-primary-foreground before:absolute before:inset-y-1 before:left-0 before:w-[3px] before:rounded-r-full before:bg-accent"
                  : "text-primary-foreground/70 hover:bg-primary-foreground/5 hover:text-primary-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
            {active && item.subNav ? (
              <ul className="ml-7 mt-1 flex flex-col gap-0.5 border-l border-primary-foreground/15 pl-3">
                {item.subNav.map((s) => {
                  const subActive =
                    pathname === s.href ||
                    (s.href !== item.href && pathname.startsWith(`${s.href}/`));
                  const badge = navBadges?.[s.href] ?? 0;
                  return (
                    <li key={s.href}>
                      <Link
                        href={s.href}
                        onClick={onNavigate}
                        className={cn(
                          "flex items-center justify-between gap-2 rounded-md px-2 py-1 text-xs transition-colors",
                          subActive
                            ? "font-semibold text-primary-foreground"
                            : "text-primary-foreground/60 hover:text-primary-foreground",
                        )}
                      >
                        <span>{s.label}</span>
                        {badge > 0 ? (
                          <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-accent-foreground">
                            {badge > 99 ? "99+" : badge}
                          </span>
                        ) : null}
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

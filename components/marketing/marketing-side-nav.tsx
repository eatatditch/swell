"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  MARKETING_NAV,
  MARKETING_NAV_GROUPS,
} from "@/lib/constants/marketing-nav";
import { cn } from "@/lib/utils";

export function MarketingSideNav() {
  const pathname = usePathname();

  const grouped = (Object.keys(MARKETING_NAV_GROUPS) as (keyof typeof MARKETING_NAV_GROUPS)[]).map(
    (g) => ({
      key: g,
      ...MARKETING_NAV_GROUPS[g],
      items: MARKETING_NAV.filter((i) => i.group === g),
    }),
  );

  return (
    <nav className="space-y-5 text-sm">
      {grouped.map((g) => (
        <div key={g.key}>
          <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.label}
          </p>
          <ul className="mt-1 space-y-0.5">
            {g.items.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/marketing" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center rounded-md px-2 py-1.5 transition-colors",
                      active
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

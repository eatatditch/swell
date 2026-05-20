import {
  LayoutDashboard,
  Compass,
  ClipboardList,
  ChefHat,
  GraduationCap,
  BookOpen,
  CalendarHeart,
  Megaphone,
  Heart,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

import type { Role } from "@/lib/types/database";

export interface SubNavItem {
  label: string;
  href: string;
}

export interface ModuleDef {
  slug: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Roles allowed to see this module in the sidebar. */
  visibleTo: Role[];
  /** In-module sub-pages shown when this module is active. */
  subNav?: SubNavItem[];
}

const ALL_ROLES: Role[] = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
  "marketing_manager",
  "catering_manager",
  "team_member",
];

export const MODULES: ModuleDef[] = [
  {
    slug: "dashboard",
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    visibleTo: ALL_ROLES,
  },
  {
    slug: "founder",
    label: "Founder View",
    href: "/founder",
    icon: Compass,
    visibleTo: ["founder_admin"],
  },
  {
    slug: "daily-ops",
    label: "Daily Ops",
    href: "/daily-ops",
    icon: ClipboardList,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "service_manager",
      "kitchen_manager",
      "team_member",
    ],
    subNav: [
      { label: "Overview", href: "/daily-ops" },
      { label: "Checklists", href: "/daily-ops/checklists" },
      { label: "Manager Logs", href: "/daily-ops/logs" },
      { label: "Issues", href: "/daily-ops/issues" },
      { label: "86'd Items", href: "/daily-ops/86d" },
      { label: "Comp / Void", href: "/daily-ops/comp-void" },
    ],
  },
  {
    slug: "kitchen",
    label: "Kitchen",
    href: "/kitchen",
    icon: ChefHat,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "service_manager",
      "kitchen_manager",
      "team_member",
    ],
  },
  {
    slug: "training",
    label: "Surf School",
    href: "/training",
    icon: GraduationCap,
    visibleTo: ALL_ROLES,
  },
  {
    slug: "specs",
    label: "Specs & Menus",
    href: "/specs",
    icon: BookOpen,
    visibleTo: ALL_ROLES,
  },
  {
    slug: "catering",
    label: "Catering & Events",
    href: "/catering",
    icon: CalendarHeart,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "kitchen_manager",
      "marketing_manager",
      "catering_manager",
    ],
    subNav: [
      { label: "Overview", href: "/catering" },
      { label: "Pipeline", href: "/catering/leads" },
      { label: "Mail", href: "/catering/mail" },
      { label: "Contacts", href: "/catering/contacts" },
      { label: "Forms", href: "/catering/forms" },
      { label: "Menus", href: "/catering/menus" },
      { label: "Quotes", href: "/catering/quotes" },
      { label: "Invoices", href: "/catering/invoices" },
      { label: "Billing", href: "/catering/billing" },
      { label: "Events", href: "/catering/events" },
      { label: "Calendar", href: "/catering/calendar" },
      { label: "Integrations", href: "/catering/integrations" },
      { label: "Settings", href: "/catering/settings" },
    ],
  },
  {
    slug: "marketing",
    label: "Marketing",
    href: "/marketing",
    icon: Megaphone,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "marketing_manager",
      "catering_manager",
    ],
  },
  {
    slug: "guest-experience",
    label: "Guest Experience",
    href: "/guest-experience",
    icon: Heart,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "service_manager",
      "kitchen_manager",
      "marketing_manager",
    ],
  },
  {
    slug: "scoreboard",
    label: "Scoreboard",
    href: "/scoreboard",
    icon: BarChart3,
    visibleTo: [
      "founder_admin",
      "general_manager",
      "service_manager",
      "kitchen_manager",
      "marketing_manager",
      "catering_manager",
    ],
  },
  {
    slug: "admin",
    label: "Admin",
    href: "/admin",
    icon: Settings,
    visibleTo: ["founder_admin"],
  },
];

export function modulesForRole(role: Role): ModuleDef[] {
  return MODULES.filter((m) => m.visibleTo.includes(role));
}

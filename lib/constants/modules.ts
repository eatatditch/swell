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

/**
 * Module icons are referenced by name so a ModuleDef stays JSON-serializable
 * across the server→client boundary. The actual component is looked up in
 * MODULE_ICONS at render time.
 */
export type ModuleIconName =
  | "LayoutDashboard"
  | "Compass"
  | "ClipboardList"
  | "ChefHat"
  | "GraduationCap"
  | "BookOpen"
  | "CalendarHeart"
  | "Megaphone"
  | "Heart"
  | "BarChart3"
  | "Settings";

export const MODULE_ICONS: Record<ModuleIconName, LucideIcon> = {
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
};

export interface ModuleDef {
  slug: string;
  label: string;
  href: string;
  iconName: ModuleIconName;
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
    iconName: "LayoutDashboard",
    visibleTo: ALL_ROLES,
  },
  {
    slug: "founder",
    label: "Founder View",
    href: "/founder",
    iconName: "Compass",
    visibleTo: ["founder_admin"],
  },
  {
    slug: "daily-ops",
    label: "Daily Ops",
    href: "/daily-ops",
    iconName: "ClipboardList",
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
    iconName: "ChefHat",
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
    iconName: "GraduationCap",
    visibleTo: ALL_ROLES,
    subNav: [
      { label: "Overview", href: "/training" },
      { label: "Staff roster", href: "/training/staff" },
      { label: "Course library", href: "/training/courses" },
      { label: "Quizzes", href: "/training/quizzes" },
      { label: "Team progress", href: "/training/progress" },
      { label: "Reports", href: "/training/reports" },
    ],
  },
  {
    slug: "specs",
    label: "Specs & Menus",
    href: "/specs",
    iconName: "BookOpen",
    visibleTo: ALL_ROLES,
  },
  {
    slug: "catering",
    label: "Catering & Events",
    href: "/catering",
    iconName: "CalendarHeart",
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
    iconName: "Megaphone",
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
    iconName: "Heart",
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
    iconName: "BarChart3",
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
    iconName: "Settings",
    visibleTo: ["founder_admin"],
  },
];

export function modulesForRole(role: Role): ModuleDef[] {
  return MODULES.filter((m) => m.visibleTo.includes(role));
}

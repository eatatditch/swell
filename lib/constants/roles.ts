import type { Role } from "@/lib/types/database";

export const ROLE_LABELS: Record<Role, string> = {
  founder_admin: "Founder / Admin",
  general_manager: "General Manager",
  service_manager: "Service Manager",
  kitchen_manager: "Kitchen Manager",
  marketing_manager: "Marketing Manager",
  catering_manager: "Catering Manager",
  team_member: "Team Member",
};

export const ROLES: Role[] = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
  "marketing_manager",
  "catering_manager",
  "team_member",
];

export function isAdmin(role: Role): boolean {
  return role === "founder_admin";
}

// Hand-written types for the Phase 1 schema. When the schema grows past
// what's practical to maintain by hand, we'll generate this with
// `supabase gen types typescript`.

export type Role =
  | "founder_admin"
  | "general_manager"
  | "service_manager"
  | "kitchen_manager"
  | "marketing_manager"
  | "catering_manager"
  | "team_member";

export type LocationSlug =
  | "bay_shore"
  | "port_jefferson"
  | "kings_park"
  | "company_wide";

export interface Location {
  id: string;
  slug: LocationSlug;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  role: Role;
  is_active: boolean;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserLocationAssignment {
  id: string;
  user_id: string;
  location_id: string;
  created_at: string;
}

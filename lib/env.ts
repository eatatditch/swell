// Centralized env access so every caller agrees on what "configured" means.
// Reading process.env at module top-level is intentional: NEXT_PUBLIC_*
// values are inlined at build time, and server-only values are read once
// per process.

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

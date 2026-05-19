import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function RootPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  redirect(user ? "/dashboard" : "/login");
}

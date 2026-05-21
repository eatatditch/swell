import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { MarketingSubscriber } from "@/lib/types/database";

export async function listSubscribers(): Promise<MarketingSubscriber[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_subscribers")
    .select("*")
    .order("is_active", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as MarketingSubscriber[];
}

export async function listAllTags(): Promise<string[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_subscribers")
    .select("tags");
  const set = new Set<string>();
  for (const row of (data ?? []) as { tags: string[] }[]) {
    for (const t of row.tags ?? []) set.add(t);
  }
  return [...set].sort();
}

export interface SubscriberCounts {
  total: number;
  emailable: number;
  textable: number;
  byTag: { tag: string; count: number }[];
}

export async function getSubscriberCounts(): Promise<SubscriberCounts> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_subscribers")
    .select("email, phone, tags, opt_in_email, opt_in_sms, opt_out_email_at, opt_out_sms_at, is_active");

  const rows = (data ?? []) as {
    email: string | null;
    phone: string | null;
    tags: string[];
    opt_in_email: boolean;
    opt_in_sms: boolean;
    opt_out_email_at: string | null;
    opt_out_sms_at: string | null;
    is_active: boolean;
  }[];

  const active = rows.filter((r) => r.is_active);
  const emailable = active.filter(
    (r) => r.email && r.opt_in_email && !r.opt_out_email_at,
  ).length;
  const textable = active.filter(
    (r) => r.phone && r.opt_in_sms && !r.opt_out_sms_at,
  ).length;

  const byTagMap = new Map<string, number>();
  for (const r of active) {
    for (const t of r.tags ?? []) {
      byTagMap.set(t, (byTagMap.get(t) ?? 0) + 1);
    }
  }

  return {
    total: active.length,
    emailable,
    textable,
    byTag: [...byTagMap.entries()]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count),
  };
}

import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  AdRequest,
  ContentItem,
  CreativeBrief,
  MarketingCampaign,
  ShotList,
  ShotListItem,
  UGCCollaboration,
} from "@/lib/types/database";

export interface CampaignListItem extends MarketingCampaign {
  owner_name: string | null;
  location_name: string | null;
  content_count: number;
  ad_count: number;
}

export async function listCampaigns(): Promise<CampaignListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_campaigns")
    .select(
      "*, owner:profiles(full_name), location:locations(name), content:content_items(id), ads:ad_requests(id)",
    )
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  type Row = MarketingCampaign & {
    owner: { full_name: string | null } | null;
    location: { name: string } | null;
    content: { id: string }[] | null;
    ads: { id: string }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    owner_name: r.owner?.full_name ?? null,
    location_name: r.location?.name ?? null,
    content_count: r.content?.length ?? 0,
    ad_count: r.ads?.length ?? 0,
  }));
}

export interface CampaignDetail extends MarketingCampaign {
  owner_name: string | null;
  location_name: string | null;
  briefs: CreativeBrief[];
  content_items: ContentItem[];
  ad_requests: AdRequest[];
  shot_lists: (ShotList & { items: ShotListItem[] })[];
  ugc_collaborations: UGCCollaboration[];
  performance_notes: {
    id: string;
    metric: string | null;
    result: string | null;
    observation: string | null;
    next_time: string | null;
  }[];
}

export async function getCampaign(id: string): Promise<CampaignDetail | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_campaigns")
    .select(
      `
      *,
      owner:profiles(full_name),
      location:locations(name),
      briefs:creative_briefs(*),
      content_items(*),
      ad_requests(*),
      shot_lists(*, items:shot_list_items(*)),
      ugc_collaborations(*),
      performance_notes:campaign_performance_notes(*)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (!data) return null;
  const row = data as MarketingCampaign & {
    owner: { full_name: string | null } | null;
    location: { name: string } | null;
    briefs: CreativeBrief[] | null;
    content_items: ContentItem[] | null;
    ad_requests: AdRequest[] | null;
    shot_lists: (ShotList & { items: ShotListItem[] | null })[] | null;
    ugc_collaborations: UGCCollaboration[] | null;
    performance_notes: {
      id: string;
      metric: string | null;
      result: string | null;
      observation: string | null;
      next_time: string | null;
    }[] | null;
  };

  return {
    ...row,
    owner_name: row.owner?.full_name ?? null,
    location_name: row.location?.name ?? null,
    briefs: row.briefs ?? [],
    content_items: (row.content_items ?? []).slice().sort((a, b) => {
      const at = a.scheduled_for ?? a.created_at;
      const bt = b.scheduled_for ?? b.created_at;
      return at < bt ? -1 : at > bt ? 1 : 0;
    }),
    ad_requests: row.ad_requests ?? [],
    shot_lists: (row.shot_lists ?? []).map((s) => ({
      ...s,
      items: (s.items ?? []).slice().sort((a, b) => a.position - b.position),
    })),
    ugc_collaborations: row.ugc_collaborations ?? [],
    performance_notes: row.performance_notes ?? [],
  };
}

export async function listContentItems(): Promise<ContentItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as ContentItem[];
}

export async function listLocations(): Promise<{ id: string; name: string }[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("locations")
    .select("id, name")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as { id: string; name: string }[];
}

export async function listActiveCampaigns(): Promise<
  { id: string; name: string }[]
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("marketing_campaigns")
    .select("id, name, status")
    .in("status", ["planning", "active"])
    .order("starts_on", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return ((data ?? []) as { id: string; name: string; status: string }[]).map(
    (c) => ({ id: c.id, name: c.name }),
  );
}

import type {
  AdChannel,
  AdRequestStatus,
  CampaignStatus,
  ContentChannel,
  ContentStatus,
  CreativeBriefStatus,
  ShotListStatus,
  UGCCollaborationStatus,
  UGCTier,
} from "@/lib/types/database";

export const CAMPAIGN_STATUSES: CampaignStatus[] = [
  "planning",
  "active",
  "paused",
  "completed",
  "cancelled",
];

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  planning: "Planning",
  active: "Active",
  paused: "Paused",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const CONTENT_CHANNELS: ContentChannel[] = [
  "instagram",
  "facebook",
  "tiktok",
  "blog",
  "website",
  "email",
  "sms",
  "print",
  "other",
];

export const CONTENT_CHANNEL_LABELS: Record<ContentChannel, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  blog: "Blog",
  website: "Website",
  email: "Email",
  sms: "SMS",
  print: "Print",
  other: "Other",
};

export const CONTENT_STATUSES: ContentStatus[] = [
  "drafting",
  "in_review",
  "approved",
  "scheduled",
  "posted",
  "archived",
];

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  posted: "Posted",
  archived: "Archived",
};

export const CREATIVE_BRIEF_STATUSES: CreativeBriefStatus[] = [
  "drafting",
  "in_review",
  "approved",
  "in_production",
  "delivered",
];

export const CREATIVE_BRIEF_STATUS_LABELS: Record<CreativeBriefStatus, string> = {
  drafting: "Drafting",
  in_review: "In review",
  approved: "Approved",
  in_production: "In production",
  delivered: "Delivered",
};

export const SHOT_LIST_STATUSES: ShotListStatus[] = [
  "planning",
  "ready",
  "shot",
  "delivered",
];

export const SHOT_LIST_STATUS_LABELS: Record<ShotListStatus, string> = {
  planning: "Planning",
  ready: "Ready",
  shot: "Shot",
  delivered: "Delivered",
};

export const AD_CHANNELS: AdChannel[] = [
  "meta",
  "google",
  "tiktok",
  "print",
  "radio",
  "out_of_home",
  "other",
];

export const AD_CHANNEL_LABELS: Record<AdChannel, string> = {
  meta: "Meta (FB/IG)",
  google: "Google",
  tiktok: "TikTok",
  print: "Print",
  radio: "Radio",
  out_of_home: "Out of home",
  other: "Other",
};

export const AD_REQUEST_STATUSES: AdRequestStatus[] = [
  "requested",
  "in_design",
  "approved",
  "live",
  "completed",
  "cancelled",
];

export const AD_REQUEST_STATUS_LABELS: Record<AdRequestStatus, string> = {
  requested: "Requested",
  in_design: "In design",
  approved: "Approved",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const UGC_TIERS: UGCTier[] = ["community", "nano", "micro", "mid", "macro"];

export const UGC_TIER_LABELS: Record<UGCTier, string> = {
  community: "Community",
  nano: "Nano (<10k)",
  micro: "Micro (10–100k)",
  mid: "Mid (100k–1M)",
  macro: "Macro (>1M)",
};

export const UGC_COLLAB_STATUSES: UGCCollaborationStatus[] = [
  "pitched",
  "agreed",
  "in_progress",
  "delivered",
  "posted",
  "paid",
  "cancelled",
];

export const UGC_COLLAB_STATUS_LABELS: Record<UGCCollaborationStatus, string> = {
  pitched: "Pitched",
  agreed: "Agreed",
  in_progress: "In progress",
  delivered: "Delivered",
  posted: "Posted",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** Status tone for chip rendering. */
export function campaignStatusTone(s: CampaignStatus): string {
  switch (s) {
    case "active":
      return "bg-primary/15 text-primary";
    case "planning":
      return "bg-accent/15 text-accent";
    case "paused":
      return "bg-amber-500/15 text-amber-700";
    case "completed":
      return "bg-muted text-muted-foreground";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700";
  }
}

export function contentStatusTone(s: ContentStatus): string {
  switch (s) {
    case "drafting":
      return "bg-muted text-muted-foreground";
    case "in_review":
      return "bg-amber-500/15 text-amber-700";
    case "approved":
      return "bg-primary/15 text-primary";
    case "scheduled":
      return "bg-accent/15 text-accent";
    case "posted":
      return "bg-emerald-500/15 text-emerald-700";
    case "archived":
      return "bg-muted text-muted-foreground line-through";
  }
}

export function shotListStatusTone(s: ShotListStatus): string {
  switch (s) {
    case "planning":
      return "bg-muted text-muted-foreground";
    case "ready":
      return "bg-accent/15 text-accent";
    case "shot":
      return "bg-primary/15 text-primary";
    case "delivered":
      return "bg-emerald-500/15 text-emerald-700";
  }
}

export function adStatusTone(s: AdRequestStatus): string {
  switch (s) {
    case "requested":
      return "bg-muted text-muted-foreground";
    case "in_design":
      return "bg-amber-500/15 text-amber-700";
    case "approved":
      return "bg-accent/15 text-accent";
    case "live":
      return "bg-primary/15 text-primary";
    case "completed":
      return "bg-emerald-500/15 text-emerald-700";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700";
  }
}

export function ugcStatusTone(s: UGCCollaborationStatus): string {
  switch (s) {
    case "pitched":
      return "bg-muted text-muted-foreground";
    case "agreed":
      return "bg-accent/15 text-accent";
    case "in_progress":
      return "bg-amber-500/15 text-amber-700";
    case "delivered":
      return "bg-primary/15 text-primary";
    case "posted":
      return "bg-emerald-500/15 text-emerald-700";
    case "paid":
      return "bg-emerald-500/15 text-emerald-700";
    case "cancelled":
      return "bg-rose-500/10 text-rose-700";
  }
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null || isNaN(cents)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function parseMoneyToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const dollars = parseFloat(cleaned);
  if (isNaN(dollars)) return null;
  return Math.round(dollars * 100);
}

export interface MarketingNavItem {
  label: string;
  href: string;
  group: "core" | "create" | "channels" | "intel" | "ai";
}

export const MARKETING_NAV: MarketingNavItem[] = [
  { label: "Dashboard", href: "/marketing", group: "core" },
  { label: "Weekly Planner", href: "/marketing/planner", group: "core" },
  { label: "Scorecard", href: "/marketing/scorecard", group: "core" },

  { label: "Campaigns", href: "/marketing/campaigns", group: "create" },
  { label: "Content Engine", href: "/marketing/content", group: "create" },
  { label: "Menu Marketing", href: "/marketing/menu-profiles", group: "create" },
  { label: "Offer Library", href: "/marketing/offers", group: "create" },
  { label: "Shot Lists", href: "/marketing/shot-lists", group: "create" },

  { label: "Meta Ads", href: "/marketing/ads", group: "channels" },
  { label: "Email & SMS", href: "/marketing/email-sms", group: "channels" },
  { label: "Local Content", href: "/marketing/local", group: "channels" },

  { label: "Private Events", href: "/marketing/private-events", group: "intel" },
  { label: "Catering", href: "/marketing/catering", group: "intel" },
  { label: "UGC / Creators", href: "/marketing/ugc", group: "intel" },
  { label: "Events", href: "/marketing/events", group: "intel" },
  { label: "Guest Segments", href: "/marketing/segments", group: "intel" },
  { label: "Reviews", href: "/marketing/reviews", group: "intel" },
  { label: "Competitors", href: "/marketing/competitors", group: "intel" },

  { label: "AI Assistant", href: "/marketing/assistant", group: "ai" },
  { label: "Brand Voice", href: "/marketing/voice", group: "ai" },
];

export const MARKETING_NAV_GROUPS: Record<
  MarketingNavItem["group"],
  { label: string; description: string }
> = {
  core: { label: "Core", description: "Where the week starts." },
  create: { label: "Plan & create", description: "What we're making." },
  channels: { label: "Channels", description: "Where it goes out." },
  intel: { label: "Intel", description: "Who, what, why, learn." },
  ai: { label: "Brain", description: "The assistant." },
};

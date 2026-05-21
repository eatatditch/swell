// Sample marketing data for Phase 8 sections that haven't been wired to
// the database yet. Kept centralized so each section reads from the same
// place and the dashboard can compute roll-ups consistently.

export const LOCATIONS = ["Bay Shore", "Port Jefferson", "Kings Park"] as const;
export type SampleLocation = (typeof LOCATIONS)[number] | "All locations";

// ---------------------------------------------------------------------------
// Dashboard KPIs
// ---------------------------------------------------------------------------
export interface LocationKpi {
  location: SampleLocation;
  weeklyGoal: number;
  weeklyActual: number;
  guestCount: number;
  checkAverage: number;
  bestDaypart: string;
  worstDaypart: string;
}

export const LOCATION_KPIS: LocationKpi[] = [
  {
    location: "Bay Shore",
    weeklyGoal: 145_000,
    weeklyActual: 138_200,
    guestCount: 3120,
    checkAverage: 44.3,
    bestDaypart: "Dinner Fri/Sat",
    worstDaypart: "Lunch Mon/Tue",
  },
  {
    location: "Port Jefferson",
    weeklyGoal: 132_000,
    weeklyActual: 141_800,
    guestCount: 2980,
    checkAverage: 47.6,
    bestDaypart: "Happy Hour",
    worstDaypart: "Sunday late",
  },
  {
    location: "Kings Park",
    weeklyGoal: 118_000,
    weeklyActual: 109_400,
    guestCount: 2410,
    checkAverage: 45.2,
    bestDaypart: "Brunch Sun",
    worstDaypart: "Wednesday",
  },
];

export interface MarketingKpi {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "good" | "warn";
}

export const TOP_LEVEL_KPIS: MarketingKpi[] = [
  { label: "Ad spend this week", value: "$3,820", delta: "+12% vs last", tone: "default" },
  { label: "Meta leads", value: "184", delta: "+22%", tone: "good" },
  { label: "Email revenue", value: "$11,420", delta: "−8%", tone: "warn" },
  { label: "SMS revenue", value: "$6,250", delta: "+34%", tone: "good" },
  { label: "Catering inquiries", value: "27", delta: "+5", tone: "good" },
  { label: "Private event inquiries", value: "14", delta: "+2", tone: "good" },
  { label: "Surf Club signups", value: "63", delta: "+9", tone: "good" },
  { label: "Website traffic", value: "21,840", delta: "+4%", tone: "default" },
  { label: "GBP activity", value: "1,210", delta: "+11%", tone: "good" },
  { label: "Takeout/delivery", value: "$22,810", delta: "−3%", tone: "warn" },
  { label: "Event ticket sales", value: "$4,400", delta: "+18%", tone: "good" },
];

export const WEEK_FOCUS: string[] = [
  "Push lunch specials Monday–Friday",
  "Promote High Tide Happy Hour at all locations",
  "Build private events content for fall booking season",
  "Capture UGC from weekend guests at Port Jeff",
  "Run catering ads to local offices",
  "Feature margaritas and tacos in Reels",
];

export const NEXT_BEST_MOVE = {
  title: "Send a Tuesday tonight-only SMS to Bay Shore Surf Club",
  why: "Slow Tuesday + 38% open rate on last similar push. Estimated revenue lift: $1,800–$2,400.",
};

// ---------------------------------------------------------------------------
// Weekly Planner
// ---------------------------------------------------------------------------
export type PlannerStatus =
  | "idea"
  | "planned"
  | "in_progress"
  | "needs_approval"
  | "scheduled"
  | "live"
  | "complete";

export const PLANNER_STATUSES: PlannerStatus[] = [
  "idea",
  "planned",
  "in_progress",
  "needs_approval",
  "scheduled",
  "live",
  "complete",
];

export const PLANNER_STATUS_LABELS: Record<PlannerStatus, string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  needs_approval: "Needs approval",
  scheduled: "Scheduled",
  live: "Live",
  complete: "Complete",
};

export interface PlannerDay {
  date: string; // YYYY-MM-DD
  weekday: string;
  primaryCampaign: string;
  content: string;
  emailSms: string | null;
  adPriority: string;
  notes: string;
  status: PlannerStatus;
  location: SampleLocation;
}

export const PLANNER_WEEK: PlannerDay[] = [
  {
    date: "2026-05-18",
    weekday: "Mon",
    primaryCampaign: "Lunch Specials Reset",
    content: "Reel: Three lunch combos under $18",
    emailSms: "Email: Monday lunch crew",
    adPriority: "Boost lunch reel — Bay Shore",
    notes: "Push the new poke bowl angle",
    status: "scheduled",
    location: "All locations",
  },
  {
    date: "2026-05-19",
    weekday: "Tue",
    primaryCampaign: "Tonight-Only SMS",
    content: "Story: Behind-the-bar Marg pour",
    emailSms: "SMS: $5 margs after 8pm",
    adPriority: "Hold",
    notes: "Slow night recovery",
    status: "needs_approval",
    location: "Bay Shore",
  },
  {
    date: "2026-05-20",
    weekday: "Wed",
    primaryCampaign: "Happy Hour Push",
    content: "Carousel: HH menu + patio",
    emailSms: null,
    adPriority: "Refresh HH creative",
    notes: "",
    status: "in_progress",
    location: "Port Jefferson",
  },
  {
    date: "2026-05-21",
    weekday: "Thu",
    primaryCampaign: "Private Events Build",
    content: "Reel: rehearsal dinner walk-through",
    emailSms: "Email: corporate buyout pitch",
    adPriority: "Launch PE ad set",
    notes: "Target zip codes within 15mi",
    status: "planned",
    location: "All locations",
  },
  {
    date: "2026-05-22",
    weekday: "Fri",
    primaryCampaign: "Weekend Hype",
    content: "Story stack: live music + brunch tease",
    emailSms: "SMS: Sat night reservation push",
    adPriority: "Scale winning Friday creative",
    notes: "",
    status: "live",
    location: "All locations",
  },
  {
    date: "2026-05-23",
    weekday: "Sat",
    primaryCampaign: "Capture Day",
    content: "UGC capture in-store, server greets",
    emailSms: null,
    adPriority: "Hold",
    notes: "Isabelle on floor 4–9pm",
    status: "planned",
    location: "Port Jefferson",
  },
  {
    date: "2026-05-24",
    weekday: "Sun",
    primaryCampaign: "Brunch Push",
    content: "Reel: bottomless brunch POV",
    emailSms: "Email: Sunday brunch reminder",
    adPriority: "Brunch ad — Kings Park",
    notes: "",
    status: "scheduled",
    location: "Kings Park",
  },
];

// ---------------------------------------------------------------------------
// Campaign types — list for builder
// ---------------------------------------------------------------------------
export const CAMPAIGN_TYPES = [
  "Awareness",
  "Happy Hour",
  "Taco",
  "Margarita",
  "Brunch",
  "Lunch Special",
  "Private Events",
  "Catering",
  "Surf Club Signup",
  "Gift Card",
  "Holiday",
  "New Menu Launch",
  "Seasonal Cocktail",
  "Event",
  "UGC",
  "Influencer",
  "Lapsed Guest Winback",
  "Birthday",
  "Review Generation",
  "Hiring / Recruiting",
] as const;

export type CampaignType = (typeof CAMPAIGN_TYPES)[number];

// ---------------------------------------------------------------------------
// Content Engine — production board
// ---------------------------------------------------------------------------
export type ContentColumn =
  | "idea"
  | "approved"
  | "needs_script"
  | "needs_shot_list"
  | "ready_to_shoot"
  | "shot"
  | "editing"
  | "needs_approval"
  | "scheduled"
  | "posted"
  | "turn_into_ad"
  | "repurpose";

export const CONTENT_COLUMNS: ContentColumn[] = [
  "idea",
  "approved",
  "needs_script",
  "needs_shot_list",
  "ready_to_shoot",
  "shot",
  "editing",
  "needs_approval",
  "scheduled",
  "posted",
  "turn_into_ad",
  "repurpose",
];

export const CONTENT_COLUMN_LABELS: Record<ContentColumn, string> = {
  idea: "Idea",
  approved: "Approved",
  needs_script: "Needs script",
  needs_shot_list: "Needs shot list",
  ready_to_shoot: "Ready to shoot",
  shot: "Shot",
  editing: "Editing",
  needs_approval: "Needs approval",
  scheduled: "Scheduled",
  posted: "Posted",
  turn_into_ad: "Turn into ad",
  repurpose: "Repurpose",
};

export interface ContentCard {
  id: string;
  title: string;
  platform: string;
  campaign: string;
  location: SampleLocation;
  talentNeeded: string;
  deadline: string;
  column: ContentColumn;
  caption?: string;
  cta?: string;
}

export const CONTENT_CARDS: ContentCard[] = [
  {
    id: "c1",
    title: "Hang 10 Marg slow-pour close-up",
    platform: "Instagram Reel",
    campaign: "Margarita Push",
    location: "All locations",
    talentNeeded: "Bartender",
    deadline: "2026-05-22",
    column: "ready_to_shoot",
    caption: "It's giving margarita o'clock.",
    cta: "DM us your favorite",
  },
  {
    id: "c2",
    title: "Lunch combo POV: Carne Asada taco set",
    platform: "TikTok",
    campaign: "Lunch Specials Reset",
    location: "Bay Shore",
    talentNeeded: "Server + food",
    deadline: "2026-05-20",
    column: "shot",
  },
  {
    id: "c3",
    title: "Private events room walk-through",
    platform: "Instagram Reel",
    campaign: "Private Events Build",
    location: "Port Jefferson",
    talentNeeded: "GM + setup",
    deadline: "2026-05-21",
    column: "needs_shot_list",
  },
  {
    id: "c4",
    title: "Bay Shore weekend guide carousel",
    platform: "Instagram Carousel",
    campaign: "Local Content",
    location: "Bay Shore",
    talentNeeded: "Designer",
    deadline: "2026-05-24",
    column: "needs_script",
  },
  {
    id: "c5",
    title: "Founder talking head: why we made the Painkiller",
    platform: "Instagram Reel",
    campaign: "Brand Voice",
    location: "All locations",
    talentNeeded: "Founder",
    deadline: "2026-05-28",
    column: "idea",
  },
  {
    id: "c6",
    title: "Brunch table flat-lay",
    platform: "Instagram Story",
    campaign: "Brunch Push",
    location: "Kings Park",
    talentNeeded: "Photographer",
    deadline: "2026-05-23",
    column: "editing",
  },
  {
    id: "c7",
    title: "Tuesday tacos $3 SMS teaser",
    platform: "SMS",
    campaign: "Tonight-Only",
    location: "All locations",
    talentNeeded: "Copy",
    deadline: "2026-05-19",
    column: "scheduled",
  },
  {
    id: "c8",
    title: "Sunset patio crowd montage",
    platform: "Instagram Reel",
    campaign: "Weekend Hype",
    location: "Port Jefferson",
    talentNeeded: "Photographer",
    deadline: "2026-05-22",
    column: "posted",
  },
  {
    id: "c9",
    title: "Margarita pour ad variant",
    platform: "Meta Ad",
    campaign: "Happy Hour Push",
    location: "All locations",
    talentNeeded: "Editor",
    deadline: "2026-05-25",
    column: "turn_into_ad",
  },
  {
    id: "c10",
    title: "Repurpose: best of April UGC reel",
    platform: "Instagram Reel",
    campaign: "UGC",
    location: "All locations",
    talentNeeded: "Editor",
    deadline: "2026-05-27",
    column: "repurpose",
  },
  {
    id: "c11",
    title: "Server greeting reaction skit",
    platform: "TikTok",
    campaign: "Brand Voice",
    location: "Bay Shore",
    talentNeeded: "Server + guest",
    deadline: "2026-05-29",
    column: "approved",
  },
  {
    id: "c12",
    title: "Catering office drop-off POV",
    platform: "Instagram Reel",
    campaign: "Catering Push",
    location: "All locations",
    talentNeeded: "Catering team",
    deadline: "2026-05-26",
    column: "needs_approval",
  },
];

export const SHOT_LIST_TEMPLATES: string[] = [
  "Margarita pour",
  "Taco build",
  "Chips + guac table drop",
  "Server greeting table",
  "Bartender shaking cocktail",
  "Happy hour crowd",
  "Patio sunset",
  "Private event setup",
  "Catering spread",
  "Staff laughing",
  "Guest cheers",
  "Kitchen action",
  "Founder talking head",
  "Manager explaining special",
  "Before/after event room",
  "Surf Club signup moment",
  "Brunch table spread",
  "Lunch special POV",
  "Dessert/churros close-up",
  "What to do this week walking shots",
];

// ---------------------------------------------------------------------------
// Menu marketing profiles
// ---------------------------------------------------------------------------
export interface MenuMarketingProfile {
  name: string;
  category: "food" | "drink";
  price: number;
  foodCostPct: number;
  marginPct: number;
  popularity: number; // 0-100
  bestAngle: string;
  bestFormat: string;
  bestCaption: string;
  bestPairing: string;
  bestUpsell: string;
  bestDaypart: string;
  bestGuestType: string;
  adWorthiness: number; // 0-100
  seasonalScore: number; // 0-100
}

export const MENU_PROFILES: MenuMarketingProfile[] = [
  {
    name: "Carne Asada Taco",
    category: "food",
    price: 7.5,
    foodCostPct: 28,
    marginPct: 72,
    popularity: 92,
    bestAngle: "Top-down build",
    bestFormat: "Reel POV",
    bestCaption: "The taco that started it all.",
    bestPairing: "Hang 10 Marg",
    bestUpsell: "Add guac",
    bestDaypart: "Lunch",
    bestGuestType: "Regulars",
    adWorthiness: 88,
    seasonalScore: 90,
  },
  {
    name: "Baja Fish Taco",
    category: "food",
    price: 8.5,
    foodCostPct: 32,
    marginPct: 68,
    popularity: 84,
    bestAngle: "Crispy crunch close-up",
    bestFormat: "TikTok ASMR",
    bestCaption: "Coastal crunch.",
    bestPairing: "Frozen Paloma",
    bestUpsell: "Side of slaw",
    bestDaypart: "Lunch + dinner",
    bestGuestType: "First-timers",
    adWorthiness: 80,
    seasonalScore: 95,
  },
  {
    name: "Jerk Shrimp Taco",
    category: "food",
    price: 9,
    foodCostPct: 35,
    marginPct: 65,
    popularity: 76,
    bestAngle: "Char + steam",
    bestFormat: "Reel",
    bestCaption: "Heat + sweet.",
    bestPairing: "Da Painkiller",
    bestUpsell: "Extra jerk sauce",
    bestDaypart: "Dinner",
    bestGuestType: "Spice fans",
    adWorthiness: 70,
    seasonalScore: 80,
  },
  {
    name: "Pork Belly Taco",
    category: "food",
    price: 9.5,
    foodCostPct: 36,
    marginPct: 64,
    popularity: 70,
    bestAngle: "Glossy glaze",
    bestFormat: "Reel ASMR",
    bestCaption: "Crisped, glazed, devoured.",
    bestPairing: "Smoke on the Bay",
    bestUpsell: "Add a second",
    bestDaypart: "Dinner",
    bestGuestType: "Foodies",
    adWorthiness: 78,
    seasonalScore: 85,
  },
  {
    name: "Chips + Guac",
    category: "food",
    price: 8,
    foodCostPct: 22,
    marginPct: 78,
    popularity: 95,
    bestAngle: "Table drop",
    bestFormat: "Story",
    bestCaption: "Round one, always.",
    bestPairing: "Hang 10 Marg",
    bestUpsell: "Make it queso",
    bestDaypart: "All",
    bestGuestType: "Everyone",
    adWorthiness: 65,
    seasonalScore: 90,
  },
  {
    name: "Hang 10 Marg",
    category: "drink",
    price: 14,
    foodCostPct: 18,
    marginPct: 82,
    popularity: 96,
    bestAngle: "Slow pour",
    bestFormat: "Reel ASMR",
    bestCaption: "It's giving margarita o'clock.",
    bestPairing: "Carne Asada Taco",
    bestUpsell: "Upgrade tequila",
    bestDaypart: "Happy Hour",
    bestGuestType: "Date night",
    adWorthiness: 95,
    seasonalScore: 92,
  },
  {
    name: "Frozen Paloma",
    category: "drink",
    price: 13,
    foodCostPct: 19,
    marginPct: 81,
    popularity: 88,
    bestAngle: "Frosted glass",
    bestFormat: "Reel",
    bestCaption: "Sip the sunset.",
    bestPairing: "Baja Fish Taco",
    bestUpsell: "Add a salt rim",
    bestDaypart: "Summer afternoon",
    bestGuestType: "Patio crowd",
    adWorthiness: 85,
    seasonalScore: 98,
  },
  {
    name: "Smoke on the Bay",
    category: "drink",
    price: 16,
    foodCostPct: 22,
    marginPct: 78,
    popularity: 72,
    bestAngle: "Smoke reveal",
    bestFormat: "TikTok",
    bestCaption: "Built to be lit.",
    bestPairing: "Pork Belly Taco",
    bestUpsell: "Premium mezcal",
    bestDaypart: "Dinner",
    bestGuestType: "Cocktail nerds",
    adWorthiness: 90,
    seasonalScore: 70,
  },
  {
    name: "Da Painkiller",
    category: "drink",
    price: 14,
    foodCostPct: 20,
    marginPct: 80,
    popularity: 82,
    bestAngle: "Nutmeg dust",
    bestFormat: "Reel",
    bestCaption: "Tropical, lethal, perfect.",
    bestPairing: "Jerk Shrimp Taco",
    bestUpsell: "Add a second",
    bestDaypart: "Happy Hour",
    bestGuestType: "Vacation mode",
    adWorthiness: 78,
    seasonalScore: 90,
  },
  {
    name: "Lobster Roll",
    category: "food",
    price: 28,
    foodCostPct: 38,
    marginPct: 62,
    popularity: 81,
    bestAngle: "Butter glisten",
    bestFormat: "Reel",
    bestCaption: "Lobster season is here.",
    bestPairing: "Frozen Paloma",
    bestUpsell: "Make it a flight",
    bestDaypart: "Lunch + dinner",
    bestGuestType: "Locals",
    adWorthiness: 92,
    seasonalScore: 95,
  },
  {
    name: "Churros",
    category: "food",
    price: 9,
    foodCostPct: 25,
    marginPct: 75,
    popularity: 78,
    bestAngle: "Sugar shake",
    bestFormat: "Reel ASMR",
    bestCaption: "Save room.",
    bestPairing: "Coffee",
    bestUpsell: "Add ice cream",
    bestDaypart: "Dinner",
    bestGuestType: "Families",
    adWorthiness: 70,
    seasonalScore: 85,
  },
  {
    name: "Big John Burger",
    category: "food",
    price: 18,
    foodCostPct: 34,
    marginPct: 66,
    popularity: 85,
    bestAngle: "Cheese pull",
    bestFormat: "TikTok",
    bestCaption: "Built like a wave.",
    bestPairing: "Hang 10 Marg",
    bestUpsell: "Make it a double",
    bestDaypart: "Lunch + dinner",
    bestGuestType: "Burger heads",
    adWorthiness: 82,
    seasonalScore: 80,
  },
];

// ---------------------------------------------------------------------------
// Offer library
// ---------------------------------------------------------------------------
export interface MarketingOffer {
  name: string;
  category: string;
  discount: string;
  rules: string;
  validHours: string;
  location: SampleLocation;
  approved: boolean;
  marginRisk: boolean;
  estimatedImpact: string;
}

export const OFFERS: MarketingOffer[] = [
  {
    name: "Tuesday Tonight-Only Marg",
    category: "Slow-night",
    discount: "$5 Hang 10 Margs after 8pm",
    rules: "Dine-in only, max 2 per guest",
    validHours: "Tue 8pm–close",
    location: "All locations",
    approved: true,
    marginRisk: false,
    estimatedImpact: "+$1,800–$2,400 per location",
  },
  {
    name: "Lunch $18 Combo",
    category: "Lunch",
    discount: "Any 2 tacos + chips + drink = $18",
    rules: "Weekdays 11–2",
    validHours: "Mon–Fri 11–2",
    location: "All locations",
    approved: true,
    marginRisk: false,
    estimatedImpact: "+15% lunch covers",
  },
  {
    name: "Surf Club Birthday",
    category: "Birthday",
    discount: "Free margarita + churros",
    rules: "Surf Club member, week of birthday",
    validHours: "Any open hour",
    location: "All locations",
    approved: true,
    marginRisk: false,
    estimatedImpact: "+1,200 visits/yr",
  },
  {
    name: "Catering: 10% Off First Order",
    category: "Catering",
    discount: "10% off",
    rules: "Min $300, new accounts only",
    validHours: "Anytime",
    location: "All locations",
    approved: true,
    marginRisk: false,
    estimatedImpact: "+8 accounts/mo",
  },
  {
    name: "Buy 1 Get 1 Tacos",
    category: "Aggressive",
    discount: "BOGO any taco",
    rules: "Wed all day",
    validHours: "Wed",
    location: "Kings Park",
    approved: false,
    marginRisk: true,
    estimatedImpact: "Untested — risk to margin",
  },
  {
    name: "Rainy Day 20% Off Bar",
    category: "Weather",
    discount: "20% bar tab when raining",
    rules: "Manager activates",
    validHours: "Any rainy day",
    location: "All locations",
    approved: true,
    marginRisk: false,
    estimatedImpact: "Recovers 30–40% of slow",
  },
];

// ---------------------------------------------------------------------------
// Meta Ads tracker
// ---------------------------------------------------------------------------
export interface MetaAdRow {
  name: string;
  objective: string;
  audience: string;
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  leads: number;
  cpl: number;
  estRevenue: number;
  roas: number;
  status: "live" | "paused" | "scaling" | "killed" | "testing";
  notes?: string;
}

export const META_ADS: MetaAdRow[] = [
  {
    name: "Happy Hour Bay Shore — Reel A",
    objective: "Engagement",
    audience: "5mi · 25–44 · interest:bars",
    budget: 1200,
    spend: 980,
    impressions: 92400,
    clicks: 1820,
    leads: 64,
    cpl: 15.3,
    estRevenue: 4400,
    roas: 4.5,
    status: "scaling",
    notes: "Best creative all month — scale +25%",
  },
  {
    name: "Catering Office Lunch",
    objective: "Lead gen",
    audience: "10mi · job:operations",
    budget: 800,
    spend: 740,
    impressions: 51200,
    clicks: 920,
    leads: 41,
    cpl: 18.0,
    estRevenue: 6800,
    roas: 9.2,
    status: "live",
  },
  {
    name: "Private Events PortJeff",
    objective: "Lead gen",
    audience: "12mi · life:engaged",
    budget: 600,
    spend: 410,
    impressions: 28800,
    clicks: 510,
    leads: 18,
    cpl: 22.7,
    estRevenue: 9200,
    roas: 22.4,
    status: "scaling",
  },
  {
    name: "Brunch Kings Park",
    objective: "Traffic",
    audience: "6mi · interest:brunch",
    budget: 500,
    spend: 490,
    impressions: 38400,
    clicks: 720,
    leads: 22,
    cpl: 22.3,
    estRevenue: 1400,
    roas: 2.9,
    status: "live",
    notes: "Creative fatigue — refresh by Friday",
  },
  {
    name: "Margarita Static Carousel",
    objective: "Engagement",
    audience: "broad LI",
    budget: 400,
    spend: 380,
    impressions: 67200,
    clicks: 480,
    leads: 9,
    cpl: 42.2,
    estRevenue: 600,
    roas: 1.6,
    status: "killed",
    notes: "Bad CPL — pause",
  },
  {
    name: "Founder Talking Head",
    objective: "Reach",
    audience: "Lookalike top 3%",
    budget: 350,
    spend: 0,
    impressions: 0,
    clicks: 0,
    leads: 0,
    cpl: 0,
    estRevenue: 0,
    roas: 0,
    status: "testing",
    notes: "Awaiting approval",
  },
];

// ---------------------------------------------------------------------------
// Email & SMS
// ---------------------------------------------------------------------------
export interface EmailRow {
  name: string;
  campaign: string;
  subject: string;
  preview: string;
  segment: string;
  sendAt: string;
  status: "draft" | "ready" | "scheduled" | "sent";
  revenue?: number;
}

export const EMAILS: EmailRow[] = [
  {
    name: "Monday Lunch Crew",
    campaign: "Lunch Specials Reset",
    subject: "Three new lunch combos. All under $18.",
    preview: "Eat fast. Get back to it.",
    segment: "Lunch guests",
    sendAt: "2026-05-18 10:00",
    status: "scheduled",
  },
  {
    name: "Brunch Reminder",
    campaign: "Brunch Push",
    subject: "Bottomless brunch is calling.",
    preview: "Sunday. Patio. Sun's up.",
    segment: "Brunch guests + lapsed",
    sendAt: "2026-05-24 09:00",
    status: "ready",
  },
  {
    name: "Corporate Buyout Pitch",
    campaign: "Private Events Build",
    subject: "Plan your team's fall off-site at Ditch.",
    preview: "Whole rooms. Real margaritas.",
    segment: "Catering + PE leads",
    sendAt: "2026-05-21 14:00",
    status: "draft",
  },
  {
    name: "Tonight-Only Marg Email",
    campaign: "Tuesday Tonight-Only",
    subject: "$5 margs — tonight only.",
    preview: "After 8pm. Don't miss it.",
    segment: "Surf Club Bay Shore",
    sendAt: "2026-05-19 16:30",
    status: "scheduled",
  },
  {
    name: "Tuesday Recap",
    campaign: "Tuesday Tonight-Only",
    subject: "What you missed last Tuesday.",
    preview: "Quick recap + this week's hook.",
    segment: "Surf Club all",
    sendAt: "2026-05-13 17:00",
    status: "sent",
    revenue: 2180,
  },
];

export interface SmsRow {
  message: string;
  segment: string;
  sendAt: string;
  status: "draft" | "scheduled" | "sent";
  clicks?: number;
  revenue?: number;
}

export const SMSES: SmsRow[] = [
  {
    message:
      "Bay Shore Surf Club — $5 Hang 10 Margs tonight after 8pm. Dine-in only. Reply STOP to opt out.",
    segment: "Bay Shore Surf Club",
    sendAt: "2026-05-19 16:00",
    status: "scheduled",
  },
  {
    message:
      "Brunch tomorrow. Bottomless mimosas. Walk-in or reserve at eatatditch.com.",
    segment: "Brunch guests",
    sendAt: "2026-05-23 17:00",
    status: "scheduled",
  },
  {
    message:
      "Saturday's almost full at Port Jeff. Grab a table at eatatditch.com.",
    segment: "Port Jeff Surf Club",
    sendAt: "2026-05-22 14:00",
    status: "scheduled",
  },
  {
    message:
      "Tonight: live music + happy hour 'til close. See you on the patio.",
    segment: "All Surf Club",
    sendAt: "2026-05-15 16:00",
    status: "sent",
    clicks: 412,
    revenue: 1820,
  },
];

// ---------------------------------------------------------------------------
// Local content
// ---------------------------------------------------------------------------
export interface LocalGuideCard {
  location: SampleLocation;
  title: string;
  highlights: string[];
  postingDate: string;
}

export const LOCAL_GUIDES: LocalGuideCard[] = [
  {
    location: "Bay Shore",
    title: "What to do in Bay Shore this weekend",
    highlights: [
      "Friday: Live music at the BACCA",
      "Saturday morning farmers market",
      "Sunset cruise on the Lauren Kristy",
      "Stop in for the Hang 10 happy hour 4–7",
    ],
    postingDate: "2026-05-22",
  },
  {
    location: "Port Jefferson",
    title: "Port Jeff weekend itinerary",
    highlights: [
      "Saturday harborwalk + brunch at Ditch",
      "Theater Three matinee",
      "Beach sunset photos",
      "Late-night taco run",
    ],
    postingDate: "2026-05-22",
  },
  {
    location: "Kings Park",
    title: "Kings Park family day guide",
    highlights: [
      "Sunken Meadow boardwalk",
      "Brunch at Ditch",
      "Nissequogue trail",
      "Soft-serve at the park",
    ],
    postingDate: "2026-05-23",
  },
];

// ---------------------------------------------------------------------------
// Private events
// ---------------------------------------------------------------------------
export interface PrivateEventLead {
  name: string;
  eventType: string;
  date: string;
  guests: number;
  budget: number;
  location: SampleLocation;
  source: string;
  status: "inquiry" | "quoted" | "booked" | "lost";
  followUp: string;
}

export const PRIVATE_EVENT_LEADS: PrivateEventLead[] = [
  {
    name: "Maddie R.",
    eventType: "Bridal shower",
    date: "2026-07-12",
    guests: 28,
    budget: 2500,
    location: "Port Jefferson",
    source: "Instagram DM",
    status: "quoted",
    followUp: "2026-05-19",
  },
  {
    name: "Acme Insurance",
    eventType: "Corporate happy hour",
    date: "2026-06-05",
    guests: 45,
    budget: 4000,
    location: "Bay Shore",
    source: "Catering form",
    status: "booked",
    followUp: "2026-05-25",
  },
  {
    name: "Carlos M.",
    eventType: "Birthday",
    date: "2026-06-21",
    guests: 18,
    budget: 1200,
    location: "Kings Park",
    source: "Walk-in",
    status: "inquiry",
    followUp: "2026-05-20",
  },
  {
    name: "Smith / Johnson",
    eventType: "Rehearsal dinner",
    date: "2026-09-10",
    guests: 32,
    budget: 3200,
    location: "Port Jefferson",
    source: "Referral",
    status: "quoted",
    followUp: "2026-05-22",
  },
];

// ---------------------------------------------------------------------------
// Catering
// ---------------------------------------------------------------------------
export interface CateringLead {
  company: string;
  contact: string;
  date: string;
  guests: number;
  budget: number;
  location: SampleLocation;
  source: string;
  status: "inquiry" | "quoted" | "booked" | "delivered" | "lost";
  followUp: string;
}

export const CATERING_LEADS: CateringLead[] = [
  {
    company: "Northport Pediatrics",
    contact: "Dr. Patel",
    date: "2026-05-29",
    guests: 22,
    budget: 600,
    location: "Bay Shore",
    source: "Cold outreach",
    status: "booked",
    followUp: "2026-05-28",
  },
  {
    company: "Bay Shore Re/Max",
    contact: "Lisa K.",
    date: "2026-06-04",
    guests: 18,
    budget: 450,
    location: "Bay Shore",
    source: "Referral",
    status: "quoted",
    followUp: "2026-05-21",
  },
  {
    company: "PJ Boat Club",
    contact: "Mark T.",
    date: "2026-06-18",
    guests: 60,
    budget: 1800,
    location: "Port Jefferson",
    source: "Instagram",
    status: "inquiry",
    followUp: "2026-05-20",
  },
  {
    company: "Smithtown Soccer",
    contact: "Coach Ramirez",
    date: "2026-05-31",
    guests: 35,
    budget: 700,
    location: "Kings Park",
    source: "Website form",
    status: "quoted",
    followUp: "2026-05-22",
  },
];

// ---------------------------------------------------------------------------
// UGC / Influencer CRM
// ---------------------------------------------------------------------------
export interface CreatorRow {
  name: string;
  handle: string;
  location: string;
  audience: number;
  engagement: number; // pct
  style: string;
  priorCollabs: number;
  costNote: string;
  rehireScore: number; // 0-100
  doNotUse: boolean;
}

export const CREATORS: CreatorRow[] = [
  {
    name: "Allison Marrero",
    handle: "@allielongisland",
    location: "Bay Shore",
    audience: 84_000,
    engagement: 4.8,
    style: "Vlog / lifestyle",
    priorCollabs: 3,
    costNote: "$400 or trade $600",
    rehireScore: 92,
    doNotUse: false,
  },
  {
    name: "Joey Pampano",
    handle: "@joeypampanoeats",
    location: "Smithtown",
    audience: 38_000,
    engagement: 6.2,
    style: "Food close-up",
    priorCollabs: 2,
    costNote: "$250 or trade $400",
    rehireScore: 88,
    doNotUse: false,
  },
  {
    name: "Sarah K.",
    handle: "@li_momma",
    location: "Port Jefferson",
    audience: 21_400,
    engagement: 7.4,
    style: "Family / mom",
    priorCollabs: 1,
    costNote: "Trade only",
    rehireScore: 78,
    doNotUse: false,
  },
  {
    name: "Cal Ridgeway",
    handle: "@calsbeats",
    location: "NYC",
    audience: 162_000,
    engagement: 2.9,
    style: "Aesthetic / pretentious",
    priorCollabs: 1,
    costNote: "$1,200",
    rehireScore: 42,
    doNotUse: true,
  },
];

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export interface EventRow {
  name: string;
  type: string;
  date: string;
  location: SampleLocation;
  ticketPrice: number;
  capacity: number;
  sold: number;
  status: "announced" | "selling" | "sold_out" | "complete";
}

export const EVENTS: EventRow[] = [
  {
    name: "Tequila Tasting",
    type: "Tasting",
    date: "2026-06-12",
    location: "Bay Shore",
    ticketPrice: 75,
    capacity: 40,
    sold: 22,
    status: "selling",
  },
  {
    name: "Margarita Class",
    type: "Class",
    date: "2026-06-18",
    location: "Port Jefferson",
    ticketPrice: 65,
    capacity: 30,
    sold: 30,
    status: "sold_out",
  },
  {
    name: "Floral Class",
    type: "Class",
    date: "2026-07-09",
    location: "Kings Park",
    ticketPrice: 85,
    capacity: 24,
    sold: 4,
    status: "announced",
  },
  {
    name: "Surf Film Watch Party",
    type: "Watch Party",
    date: "2026-05-30",
    location: "Bay Shore",
    ticketPrice: 0,
    capacity: 75,
    sold: 41,
    status: "selling",
  },
];

// ---------------------------------------------------------------------------
// Guest segments
// ---------------------------------------------------------------------------
export interface SegmentRow {
  name: string;
  size: number;
  bestChannel: string;
  bestOffer: string;
  bestCampaign: string;
  lastContacted: string;
}

export const SEGMENTS: SegmentRow[] = [
  { name: "First-time guests", size: 1840, bestChannel: "Email", bestOffer: "10% off return visit", bestCampaign: "First-Time Winback", lastContacted: "2026-05-10" },
  { name: "Regulars", size: 920, bestChannel: "SMS", bestOffer: "Free dessert", bestCampaign: "Surf Club Birthday", lastContacted: "2026-05-12" },
  { name: "High spenders", size: 240, bestChannel: "Email", bestOffer: "Reserve patio", bestCampaign: "VIP nights", lastContacted: "2026-05-08" },
  { name: "Lapsed guests", size: 3200, bestChannel: "Email + Meta", bestOffer: "Free margarita on return", bestCampaign: "Winback", lastContacted: "2026-04-22" },
  { name: "Birthday this month", size: 410, bestChannel: "Email + SMS", bestOffer: "Free marg + churros", bestCampaign: "Birthday Push", lastContacted: "2026-05-01" },
  { name: "Catering leads", size: 86, bestChannel: "Email", bestOffer: "10% first order", bestCampaign: "Catering Build", lastContacted: "2026-05-14" },
  { name: "Brunch guests", size: 1240, bestChannel: "Email", bestOffer: "Bottomless mimosa", bestCampaign: "Brunch Push", lastContacted: "2026-05-09" },
  { name: "Lunch guests", size: 760, bestChannel: "SMS", bestOffer: "$18 combo", bestCampaign: "Lunch Reset", lastContacted: "2026-05-15" },
  { name: "Surf Club members", size: 4810, bestChannel: "Email + SMS", bestOffer: "Member-only nights", bestCampaign: "Surf Club Build", lastContacted: "2026-05-15" },
  { name: "Gift card buyers", size: 320, bestChannel: "Email", bestOffer: "Gift card + free entree", bestCampaign: "Gift Card Push", lastContacted: "2026-04-28" },
];

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------
export interface ReviewSnippet {
  source: "Google" | "Yelp";
  location: SampleLocation;
  stars: number;
  body: string;
  theme: "praise" | "complaint" | "shoutout";
  reviewer: string;
  date: string;
}

export const REVIEWS: ReviewSnippet[] = [
  {
    source: "Google",
    location: "Bay Shore",
    stars: 5,
    body: "Our server Mia was incredible — the margs and tacos were perfect, will be back!",
    theme: "shoutout",
    reviewer: "Jenny P.",
    date: "2026-05-14",
  },
  {
    source: "Google",
    location: "Port Jefferson",
    stars: 5,
    body: "Best happy hour on the harbor. Smoke on the Bay is unreal.",
    theme: "praise",
    reviewer: "Mike H.",
    date: "2026-05-13",
  },
  {
    source: "Yelp",
    location: "Kings Park",
    stars: 2,
    body: "Waited 25 minutes for chips. Otherwise food was fine.",
    theme: "complaint",
    reviewer: "Anna S.",
    date: "2026-05-12",
  },
  {
    source: "Google",
    location: "Bay Shore",
    stars: 4,
    body: "Loud but fun. Tacos are great. Wish there was more vegetarian.",
    theme: "complaint",
    reviewer: "Pat K.",
    date: "2026-05-11",
  },
  {
    source: "Yelp",
    location: "Port Jefferson",
    stars: 5,
    body: "Manager Hector hooked us up for our anniversary. Real ones.",
    theme: "shoutout",
    reviewer: "Linda T.",
    date: "2026-05-10",
  },
];

// ---------------------------------------------------------------------------
// Competitor intel
// ---------------------------------------------------------------------------
export interface CompetitorNote {
  competitor: string;
  category: string;
  observation: string;
  steal: string;
}

export const COMPETITORS: CompetitorNote[] = [
  {
    competitor: "bartaco",
    category: "Brand voice",
    observation: "Clean copy, minimal hashtags, lots of food close-ups.",
    steal: "Adopt cleaner caption style for menu posts.",
  },
  {
    competitor: "CAVA",
    category: "Email cadence",
    observation: "Send 2x/week consistently, simple subject lines.",
    steal: "Move to 2x/week schedule for Surf Club.",
  },
  {
    competitor: "Chili's",
    category: "Happy Hour",
    observation: "$5 margarita all day — drives weekday traffic.",
    steal: "Test a Tuesday-only $5 marg ourselves.",
  },
  {
    competitor: "SERHANT.",
    category: "Founder content",
    observation: "Founder face-to-camera generates outsized engagement.",
    steal: "Stand up monthly founder talking head with Andrew.",
  },
  {
    competitor: "Aviation Gin",
    category: "Brand humor",
    observation: "Dry humor, slightly absurd, never punching down.",
    steal: "Add a 'too cringe?' filter on captions.",
  },
  {
    competitor: "Little Joy",
    category: "Local content",
    observation: "Hyper-local town guides drive saves and shares.",
    steal: "Make a weekly town guide carousel per location.",
  },
];

// ---------------------------------------------------------------------------
// Scorecard
// ---------------------------------------------------------------------------
export interface ScorecardRow {
  category: string;
  score: "green" | "yellow" | "red";
  note: string;
  recommendation: string;
}

export const SCORECARD: ScorecardRow[] = [
  { category: "Content volume", score: "green", note: "12 posts this week", recommendation: "Hold the pace." },
  { category: "Content quality", score: "yellow", note: "Two reels under 1k views", recommendation: "Tighten hooks in first 1.5s." },
  { category: "Posting consistency", score: "green", note: "5/7 days posted", recommendation: "Cover Wed + Sat next week." },
  { category: "Email sent", score: "green", note: "3 emails sent", recommendation: "Keep cadence." },
  { category: "SMS sent", score: "yellow", note: "1 SMS sent", recommendation: "Add a Saturday push." },
  { category: "Ads active", score: "green", note: "5 active ads", recommendation: "Kill the static carousel." },
  { category: "Leads generated", score: "green", note: "184 leads", recommendation: "Scale Happy Hour Reel A." },
  { category: "Private event inquiries", score: "yellow", note: "14 inquiries", recommendation: "Push corporate buyout pitch." },
  { category: "Catering inquiries", score: "green", note: "27 inquiries", recommendation: "Hold." },
  { category: "Surf Club signups", score: "green", note: "63 signups", recommendation: "Keep birthday CTA visible." },
  { category: "Engagement rate", score: "yellow", note: "Avg 3.2%", recommendation: "Front-load hooks." },
  { category: "Website traffic", score: "green", note: "+4% w/w", recommendation: "Keep." },
  { category: "Revenue attributed", score: "green", note: "$17.6k attrib.", recommendation: "Hold." },
  { category: "Creative testing", score: "red", note: "0 tests this week", recommendation: "Ship 2 test creatives." },
  { category: "Community/local content", score: "yellow", note: "1 local guide", recommendation: "Publish 1 per location/wk." },
  { category: "UGC collected", score: "yellow", note: "4 pieces", recommendation: "Activate weekend capture." },
  { category: "Review generation", score: "red", note: "12 new reviews", recommendation: "Trigger review request emails." },
  { category: "Event promotion", score: "yellow", note: "2 events promoted", recommendation: "Push the Tequila Tasting harder." },
  { category: "Offer clarity", score: "green", note: "Clean", recommendation: "—" },
  { category: "Brand consistency", score: "green", note: "On voice", recommendation: "—" },
];

// ---------------------------------------------------------------------------
// AI assistant — sample prompts + canned responses
// ---------------------------------------------------------------------------
export interface AssistantPrompt {
  prompt: string;
  cannedResponse: string;
}

export const ASSISTANT_PROMPTS: AssistantPrompt[] = [
  {
    prompt: "What should we promote this week?",
    cannedResponse:
      "High Tide Happy Hour (margin > 80%) + Tonight-Only $5 Margs at Bay Shore Tuesday. Both align with weak weekday daypart performance.",
  },
  {
    prompt: "What should we post today?",
    cannedResponse:
      "Hang 10 Marg slow-pour reel — it's ready to shoot and we have 0 posts scheduled today.",
  },
  {
    prompt: "What campaign should we run for Bay Shore?",
    cannedResponse:
      "Lunch Specials Reset. Lunch is the weakest daypart at Bay Shore (-12% vs goal). Three-combo offer + Meta lunch reel.",
  },
  {
    prompt: "What should Isabelle work on today?",
    cannedResponse:
      "Capture UGC at Port Jeff 4–9pm (Saturday capture day on the planner) and finish the corporate buyout email draft.",
  },
  {
    prompt: "What ads should we turn off?",
    cannedResponse: "Margarita Static Carousel (CPL $42 vs target $20). Already flagged in the Ads tracker.",
  },
  {
    prompt: "What ads should we scale?",
    cannedResponse:
      "Happy Hour Bay Shore — Reel A (ROAS 4.5 + best CPL). Scale 25% and clone for Port Jeff.",
  },
  {
    prompt: "What email should we send?",
    cannedResponse:
      "Corporate Buyout Pitch — your draft is sitting in the Email module. Sending Thursday 2pm to Catering + PE leads.",
  },
  {
    prompt: "What menu item should we push?",
    cannedResponse: "Hang 10 Marg (82% margin, 96 popularity) and Carne Asada Taco.",
  },
  {
    prompt: "What did we learn from last week?",
    cannedResponse:
      "Saturday capture drove 41% of UGC. Lunch reel posted Monday outperformed Tuesday's. Review requests had a 2.4% conversion — bump to 5%+ by triggering on POS.",
  },
  {
    prompt: "What is the next best move?",
    cannedResponse: NEXT_BEST_MOVE.title + " — " + NEXT_BEST_MOVE.why,
  },
];

// ---------------------------------------------------------------------------
// Brand voice generator
// ---------------------------------------------------------------------------
export const VOICE_MODES = [
  "Dry humor",
  "Founder voice",
  "Bartaco-polished",
  "Aviation Gin-style",
  "Local community voice",
  "Slightly unhinged but still legal",
  "Family-friendly",
  "Event hype",
  "Premium / private event",
  "Recruiting voice",
] as const;

export const VOICE_OUTPUTS = [
  "Caption",
  "Email",
  "SMS",
  "Ad copy",
  "Website copy",
  "Menu description",
  "Staff script",
  "Event description",
  "Press blurb",
  "Comment reply",
] as const;

export const VOICE_SAMPLES: Record<string, string> = {
  "Dry humor:Caption":
    "We made the margaritas extra cold because the weather is taking its time.",
  "Founder voice:Caption":
    "First time we tried this taco, the kitchen argued about it for an hour. Worth it.",
  "Bartaco-polished:Caption": "Sun. Salt. Margarita.",
  "Aviation Gin-style:Caption":
    "Our margaritas are not for everyone. Just the people who like things to be good.",
  "Local community voice:Caption":
    "Made for the Bay Shore people. By the Bay Shore people. With extra lime.",
  "Slightly unhinged but still legal:Caption":
    "If you don't come for this margarita we won't take it personally. But we will.",
};

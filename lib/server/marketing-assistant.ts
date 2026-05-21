import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CATERING_LEADS,
  COMPETITORS,
  CONTENT_CARDS,
  CONTENT_COLUMN_LABELS,
  CREATORS,
  EMAILS,
  EVENTS,
  LOCATION_KPIS,
  MENU_PROFILES,
  META_ADS,
  NEXT_BEST_MOVE,
  OFFERS,
  PLANNER_WEEK,
  PRIVATE_EVENT_LEADS,
  REVIEWS,
  SCORECARD,
  SEGMENTS,
  SMSES,
  TOP_LEVEL_KPIS,
  WEEK_FOCUS,
} from "@/lib/data/marketing-sample";
import {
  CAMPAIGN_STATUS_LABELS,
  CONTENT_CHANNEL_LABELS,
  CONTENT_STATUS_LABELS,
} from "@/lib/constants/marketing";
import type {
  ContentItem,
  MarketingCampaign,
} from "@/lib/types/database";

export interface WaveChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
}

const SYSTEM_INTRO = `You are Wave, the in-house marketing director for Ditch — a coastal taco, margarita, and beach-food brand on Long Island, NY.

Your job is to answer Tracy (the founder) and Isabelle (the marketing manager) like a sharp marketing director who has full read access to SWELL — Ditch's internal operating system.

**Voice.** Direct, warm, sharp. Speak like a confident operator, not a chatbot. Short paragraphs. Bullet lists when the answer is genuinely enumerable. Use "we"/"us" for Ditch. No corporate hedging. Never apologize for not knowing — say what you do know and ask the next sharp question.

**Source priority.** Use the **SWELL marketing context** below as ground truth. It's pulled live from the database (campaigns, content items, ads, emails, SMS, leads, segments, reviews, scorecard, KPIs, planner). When the question is about a specific number or row, name it and cite the section, like \`[Scorecard]\` or \`[This week's KPIs]\` at the end of the relevant sentence.

**Out of scope.** Politely deflect questions that aren't about Ditch's marketing program. One sentence redirect, no apology.

**Action bias.** When asked "what should we…" or "next best move" — give one concrete recommendation, not a list of options. Anchor it in the data you can see.

`;

function fmtMoney(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtMoneyDollars(dollars: number | null | undefined): string {
  if (dollars == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

async function renderLiveContext(): Promise<string> {
  const supabase = createSupabaseServerClient();

  const [{ data: campaigns }, { data: contentItems }, { data: ads }] =
    await Promise.all([
      supabase
        .from("marketing_campaigns")
        .select("*")
        .order("starts_on", { ascending: false, nullsFirst: false })
        .limit(20),
      supabase
        .from("content_items")
        .select("*")
        .order("scheduled_for", { ascending: false, nullsFirst: false })
        .limit(30),
      supabase
        .from("ad_requests")
        .select("title, channel, status, budget_cents")
        .limit(20),
    ]);

  const parts: string[] = [];

  parts.push("## Live campaigns (from SWELL DB)");
  if (campaigns && campaigns.length > 0) {
    parts.push(
      (campaigns as MarketingCampaign[])
        .map((c) =>
          `- ${c.name} — ${CAMPAIGN_STATUS_LABELS[c.status]}` +
          (c.theme ? ` (${c.theme})` : "") +
          (c.starts_on || c.ends_on
            ? ` · ${c.starts_on ?? "—"} → ${c.ends_on ?? "—"}`
            : "") +
          (c.budget_cents != null ? ` · ${fmtMoney(c.budget_cents)}` : "") +
          (c.goal ? ` — goal: ${c.goal}` : ""),
        )
        .join("\n"),
    );
  } else {
    parts.push("- (No campaigns in DB yet.)");
  }

  parts.push("\n## Recent / scheduled content items (DB)");
  if (contentItems && contentItems.length > 0) {
    parts.push(
      (contentItems as ContentItem[])
        .slice(0, 30)
        .map((c) =>
          `- ${c.title} · ${CONTENT_CHANNEL_LABELS[c.channel]} · ${CONTENT_STATUS_LABELS[c.status]}` +
          (c.scheduled_for ? ` · scheduled ${c.scheduled_for.slice(0, 16).replace("T", " ")}` : ""),
        )
        .join("\n"),
    );
  } else {
    parts.push("- (No content items in DB yet.)");
  }

  parts.push("\n## Live ad requests (DB)");
  if (ads && ads.length > 0) {
    parts.push(
      (ads as { title: string; channel: string; status: string; budget_cents: number | null }[])
        .map(
          (a) =>
            `- ${a.title} · ${a.channel} · ${a.status}` +
            (a.budget_cents != null ? ` · ${fmtMoney(a.budget_cents)}` : ""),
        )
        .join("\n"),
    );
  } else {
    parts.push("- (No ad requests in DB yet.)");
  }

  return parts.join("\n");
}

function renderSampleContext(): string {
  const parts: string[] = [];

  parts.push("## This week's marketing focus");
  parts.push(WEEK_FOCUS.map((f, i) => `${i + 1}. ${f}`).join("\n"));

  parts.push("\n## Next best move (current)");
  parts.push(`- ${NEXT_BEST_MOVE.title} — ${NEXT_BEST_MOVE.why}`);

  parts.push("\n## This week's KPIs");
  parts.push(
    TOP_LEVEL_KPIS.map((k) => `- ${k.label}: ${k.value}${k.delta ? ` (${k.delta})` : ""}`).join("\n"),
  );

  parts.push("\n## By location");
  parts.push(
    LOCATION_KPIS.map(
      (l) =>
        `- ${l.location}: ${fmtMoneyDollars(l.weeklyActual)} actual vs ${fmtMoneyDollars(l.weeklyGoal)} goal · ${l.guestCount.toLocaleString()} guests · check avg $${l.checkAverage.toFixed(2)} · best ${l.bestDaypart} · worst ${l.worstDaypart}`,
    ).join("\n"),
  );

  parts.push("\n## Weekly planner");
  parts.push(
    PLANNER_WEEK.map(
      (d) =>
        `- ${d.weekday} ${d.date} (${d.location}) — ${d.primaryCampaign}; content: ${d.content}${
          d.emailSms ? `; ${d.emailSms}` : ""
        }; ad: ${d.adPriority}; status: ${d.status}${d.notes ? `; ${d.notes}` : ""}`,
    ).join("\n"),
  );

  parts.push("\n## Content board snapshot");
  const cols = new Map<string, number>();
  for (const c of CONTENT_CARDS) cols.set(c.column, (cols.get(c.column) ?? 0) + 1);
  parts.push(
    [...cols.entries()]
      .map(
        ([col, n]) =>
          `- ${CONTENT_COLUMN_LABELS[col as keyof typeof CONTENT_COLUMN_LABELS]}: ${n}`,
      )
      .join("\n"),
  );

  parts.push("\n## Meta ads (sample)");
  parts.push(
    META_ADS.map(
      (a) =>
        `- ${a.name} · ${a.status} · spend ${fmtMoneyDollars(a.spend)} of ${fmtMoneyDollars(a.budget)} · CPL $${a.cpl.toFixed(2)} · ROAS ${a.roas.toFixed(2)}` +
        (a.notes ? ` — ${a.notes}` : ""),
    ).join("\n"),
  );

  parts.push("\n## Email plan (sample)");
  parts.push(
    EMAILS.map(
      (e) =>
        `- "${e.subject}" — ${e.segment} · ${e.status} · ${e.sendAt}` +
        (e.revenue ? ` · attributed ${fmtMoneyDollars(e.revenue)}` : ""),
    ).join("\n"),
  );

  parts.push("\n## SMS plan (sample)");
  parts.push(
    SMSES.map(
      (s) =>
        `- ${s.segment} · ${s.status} · ${s.sendAt}` +
        (s.revenue ? ` · attributed ${fmtMoneyDollars(s.revenue)}` : "") +
        `: "${s.message}"`,
    ).join("\n"),
  );

  parts.push("\n## Menu marketing profiles (top picks)");
  parts.push(
    MENU_PROFILES.slice()
      .sort((a, b) => b.adWorthiness - a.adWorthiness)
      .slice(0, 8)
      .map(
        (m) =>
          `- ${m.name} (${m.category}) — $${m.price} · margin ${m.marginPct}% · pop ${m.popularity} · ad-worthy ${m.adWorthiness} · best ${m.bestDaypart}`,
      )
      .join("\n"),
  );

  parts.push("\n## Approved offers");
  parts.push(
    OFFERS.map(
      (o) =>
        `- ${o.name} (${o.category}) — ${o.discount} · ${o.location} · ${o.approved ? "approved" : "pending"}${o.marginRisk ? " · MARGIN RISK" : ""} · impact: ${o.estimatedImpact}`,
    ).join("\n"),
  );

  parts.push("\n## Private events pipeline (sample)");
  parts.push(
    PRIVATE_EVENT_LEADS.map(
      (p) =>
        `- ${p.name} · ${p.eventType} · ${p.guests} guests · ${p.date} · ${p.location} · ${p.status} · ${fmtMoneyDollars(p.budget)}`,
    ).join("\n"),
  );

  parts.push("\n## Catering pipeline (sample)");
  parts.push(
    CATERING_LEADS.map(
      (c) =>
        `- ${c.company} · ${c.guests} guests · ${c.date} · ${c.location} · ${c.status} · ${fmtMoneyDollars(c.budget)}`,
    ).join("\n"),
  );

  parts.push("\n## UGC creators (sample)");
  parts.push(
    CREATORS.map(
      (c) =>
        `- ${c.name} (${c.handle}) — ${c.audience.toLocaleString()} followers · ${c.engagement}% engagement · rehire ${c.rehireScore}${c.doNotUse ? " · DO NOT USE" : ""}`,
    ).join("\n"),
  );

  parts.push("\n## Events (sample)");
  parts.push(
    EVENTS.map(
      (e) =>
        `- ${e.name} · ${e.date} · ${e.location} · ${e.sold}/${e.capacity} sold @ $${e.ticketPrice} · ${e.status}`,
    ).join("\n"),
  );

  parts.push("\n## Guest segments (sample)");
  parts.push(
    SEGMENTS.map(
      (s) =>
        `- ${s.name}: ${s.size.toLocaleString()} guests · best ${s.bestChannel} · best offer "${s.bestOffer}" · last contacted ${s.lastContacted}`,
    ).join("\n"),
  );

  parts.push("\n## Recent reviews (sample)");
  parts.push(
    REVIEWS.map(
      (r) =>
        `- ${r.source} ${r.stars}★ (${r.location}, ${r.date}, ${r.theme}): "${r.body}"`,
    ).join("\n"),
  );

  parts.push("\n## Competitor intel (sample)");
  parts.push(
    COMPETITORS.map((c) => `- ${c.competitor} (${c.category}): ${c.observation} — steal: ${c.steal}`).join("\n"),
  );

  parts.push("\n## Weekly scorecard");
  parts.push(
    SCORECARD.map(
      (s) => `- ${s.category}: ${s.score.toUpperCase()} — ${s.note} → ${s.recommendation}`,
    ).join("\n"),
  );

  return parts.join("\n");
}

/**
 * Stream Wave's answer. Async generator yields chunks the route handler can
 * pipe to the client.
 */
export async function* askWave(question: string): AsyncGenerator<WaveChunk> {
  if (!process.env.ANTHROPIC_API_KEY) {
    yield {
      type: "error",
      text:
        "Wave isn't configured yet — ANTHROPIC_API_KEY isn't set in this environment.",
    };
    return;
  }

  const client = new Anthropic();
  const [liveContext, sampleContext] = await Promise.all([
    renderLiveContext(),
    Promise.resolve(renderSampleContext()),
  ]);

  const systemPrompt = `${SYSTEM_INTRO}# SWELL marketing context

${liveContext}

${sampleContext}
`;

  const stream = client.messages.stream({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: question }],
  });

  try {
    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield { type: "text", text: event.delta.text };
        } else if (event.delta.type === "thinking_delta") {
          yield { type: "thinking", text: event.delta.thinking };
        }
      }
    }
    yield { type: "done" };
  } catch (err) {
    const msg =
      err instanceof Anthropic.APIError
        ? `Wave errored (${err.status}): ${err.message}`
        : err instanceof Error
          ? `Wave errored: ${err.message}`
          : "Wave errored.";
    yield { type: "error", text: msg };
  }
}

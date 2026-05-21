"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  AD_CHANNELS,
  AD_REQUEST_STATUSES,
  CAMPAIGN_STATUSES,
  CONTENT_CHANNELS,
  CONTENT_STATUSES,
  parseMoneyToCents,
} from "@/lib/constants/marketing";

async function requireMarketer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, userId: null, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  const role = (profile as { role: string } | null)?.role;
  const ok =
    role === "founder_admin" ||
    role === "general_manager" ||
    role === "marketing_manager";
  if (!ok) return { supabase, userId: user.id, error: "Marketers only" as const };
  return { supabase, userId: user.id, error: null };
}

// ---------------------------------------------------------------------------
// Campaigns
// ---------------------------------------------------------------------------

const campaignSchema = z.object({
  name: z.string().min(1, "Name is required").max(160),
  theme: z.string().max(160).optional().nullable(),
  goal: z.string().max(500).optional().nullable(),
  description: z.string().max(4000).optional().nullable(),
  status: z.enum(CAMPAIGN_STATUSES as [string, ...string[]]).default("planning"),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  ownerId: z.string().uuid().optional().nullable(),
  locationId: z.string().uuid().optional().nullable(),
  channels: z.array(z.enum(CONTENT_CHANNELS as [string, ...string[]])).default([]),
  budget: z.string().optional().nullable(),
});

export async function createCampaign(raw: z.input<typeof campaignSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = campaignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const budgetCents = v.budget ? parseMoneyToCents(v.budget) : null;

  const { data, error } = await ctx.supabase
    .from("marketing_campaigns")
    .insert({
      created_by: ctx.userId,
      name: v.name.trim(),
      theme: v.theme?.trim() || null,
      goal: v.goal?.trim() || null,
      description: v.description?.trim() || null,
      status: v.status,
      starts_on: v.startsOn ?? null,
      ends_on: v.endsOn ?? null,
      owner_id: v.ownerId ?? null,
      location_id: v.locationId ?? null,
      channels: v.channels,
      budget_cents: budgetCents,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create" };
  revalidatePath("/marketing/campaigns", "layout");
  return { ok: true, id: data.id as string };
}

export async function updateCampaignStatus(id: string, status: string) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const ok = (CAMPAIGN_STATUSES as readonly string[]).includes(status);
  if (!ok) return { error: "Invalid status" };
  const { error } = await ctx.supabase
    .from("marketing_campaigns")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marketing/campaigns", "layout");
  return { ok: true };
}

export async function deleteCampaign(id: string) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const { error } = await ctx.supabase
    .from("marketing_campaigns")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marketing/campaigns", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Content items
// ---------------------------------------------------------------------------

const contentItemSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  title: z.string().min(1, "Title is required").max(200),
  channel: z.enum(CONTENT_CHANNELS as [string, ...string[]]),
  status: z.enum(CONTENT_STATUSES as [string, ...string[]]).default("drafting"),
  scheduledFor: z.string().datetime().optional().nullable(),
  body: z.string().max(8000).optional().nullable(),
  caption: z.string().max(2200).optional().nullable(),
  assigneeId: z.string().uuid().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createContentItem(raw: z.input<typeof contentItemSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = contentItemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error } = await ctx.supabase
    .from("content_items")
    .insert({
      created_by: ctx.userId,
      campaign_id: v.campaignId ?? null,
      title: v.title.trim(),
      channel: v.channel,
      status: v.status,
      scheduled_for: v.scheduledFor ?? null,
      body: v.body?.trim() || null,
      caption: v.caption?.trim() || null,
      assignee_id: v.assigneeId ?? null,
      notes: v.notes?.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) return { error: error?.message ?? "Could not create" };
  revalidatePath("/marketing/content", "layout");
  revalidatePath("/marketing/campaigns", "layout");
  return { ok: true, id: data.id as string };
}

export async function updateContentItemStatus(id: string, status: string) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const ok = (CONTENT_STATUSES as readonly string[]).includes(status);
  if (!ok) return { error: "Invalid status" };
  const { error } = await ctx.supabase
    .from("content_items")
    .update({ status })
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/marketing/content", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Creative briefs
// ---------------------------------------------------------------------------

const briefSchema = z.object({
  campaignId: z.string().uuid(),
  title: z.string().min(1).max(200),
  audience: z.string().max(2000).optional().nullable(),
  objectives: z.string().max(2000).optional().nullable(),
  keyMessages: z.string().max(2000).optional().nullable(),
  mandatories: z.string().max(2000).optional().nullable(),
  tone: z.string().max(500).optional().nullable(),
  deliverables: z.string().max(2000).optional().nullable(),
  deadlineOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function createBrief(raw: z.input<typeof briefSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = briefSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { error } = await ctx.supabase.from("creative_briefs").insert({
    created_by: ctx.userId,
    campaign_id: v.campaignId,
    title: v.title.trim(),
    audience: v.audience?.trim() || null,
    objectives: v.objectives?.trim() || null,
    key_messages: v.keyMessages?.trim() || null,
    mandatories: v.mandatories?.trim() || null,
    tone: v.tone?.trim() || null,
    deliverables: v.deliverables?.trim() || null,
    deadline_on: v.deadlineOn ?? null,
  });
  if (error) return { error: error.message };
  revalidatePath("/marketing/campaigns", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ad requests
// ---------------------------------------------------------------------------

const adRequestSchema = z.object({
  campaignId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  channel: z.enum(AD_CHANNELS as [string, ...string[]]),
  goal: z.string().max(2000).optional().nullable(),
  copy: z.string().max(4000).optional().nullable(),
  budget: z.string().optional().nullable(),
  startsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  endsOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  status: z.enum(AD_REQUEST_STATUSES as [string, ...string[]]).default("requested"),
});

export async function createAdRequest(raw: z.input<typeof adRequestSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = adRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const budgetCents = v.budget ? parseMoneyToCents(v.budget) : null;
  const { error } = await ctx.supabase.from("ad_requests").insert({
    created_by: ctx.userId,
    campaign_id: v.campaignId ?? null,
    title: v.title.trim(),
    channel: v.channel,
    goal: v.goal?.trim() || null,
    copy: v.copy?.trim() || null,
    budget_cents: budgetCents,
    starts_on: v.startsOn ?? null,
    ends_on: v.endsOn ?? null,
    status: v.status,
    requester_id: ctx.userId,
  });
  if (error) return { error: error.message };
  revalidatePath("/marketing/campaigns", "layout");
  revalidatePath("/marketing/ads", "layout");
  return { ok: true };
}

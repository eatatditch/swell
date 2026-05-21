"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  resolveAudience,
  sendContentItem,
  testSendContentItem,
} from "@/lib/server/marketing-send";

async function requireMarketer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
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
  if (!ok) return { supabase, error: "Marketers only" as const };
  return { supabase, error: null };
}

export interface PreviewAudienceResult {
  total: number;
  channel: "email" | "sms";
  tags: string[];
  sampleNames: string[];
}

export async function previewAudience(
  contentItemId: string,
): Promise<PreviewAudienceResult | { error: string }> {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const { data } = await ctx.supabase
    .from("content_items")
    .select("channel, target_tags")
    .eq("id", contentItemId)
    .maybeSingle();
  if (!data) return { error: "Item not found" };
  const item = data as { channel: string; target_tags: string[] };
  if (item.channel !== "email" && item.channel !== "sms") {
    return { error: `Channel ${item.channel} is not sendable` };
  }
  const audience = await resolveAudience({
    channel: item.channel as "email" | "sms",
    target_tags: item.target_tags ?? [],
  });
  return {
    total: audience.total,
    channel: item.channel as "email" | "sms",
    tags: item.target_tags ?? [],
    sampleNames: audience.subscribers
      .slice(0, 5)
      .map((s) => s.name ?? s.email ?? s.phone ?? "—"),
  };
}

const sendSchema = z.object({ id: z.string().uuid() });

export async function sendNow(raw: z.input<typeof sendSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = sendSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const res = await sendContentItem(parsed.data.id);
  revalidatePath("/marketing/email-sms", "layout");
  revalidatePath("/marketing/content", "layout");
  return res;
}

const testSendSchema = z.object({
  id: z.string().uuid(),
  recipient: z.string().min(1).max(160),
});

export async function testSend(raw: z.input<typeof testSendSchema>) {
  const ctx = await requireMarketer();
  if (ctx.error) return { error: ctx.error };
  const parsed = testSendSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  return testSendContentItem(parsed.data.id, parsed.data.recipient.trim());
}

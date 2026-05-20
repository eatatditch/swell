import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import {
  leadSourceFromForm,
  mapSubmissionToLead,
  validateSubmission,
} from "@/lib/forms/schema";
import type {
  FormSchema,
  FormSettings,
  FormSourceChannel,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Permissive CORS — the form is meant to be embeddable anywhere. The
// service-role write is gated behind slug + payload validation, not origin.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// Per-IP rate limit: at most 5 submissions to the same form from the same IP
// in the last 5 minutes. Bots get bored, real guests resubmit at most once.
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 5;

interface SubmitBody {
  payload?: Record<string, unknown>;
  source_url?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { slug: string } },
) {
  const slug = params.slug?.toLowerCase();
  if (!slug) {
    return json({ error: "Missing form slug" }, 400);
  }

  let body: SubmitBody;
  try {
    body = (await request.json()) as SubmitBody;
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const payload = body?.payload ?? {};
  if (typeof payload !== "object" || Array.isArray(payload)) {
    return json({ error: "payload must be an object" }, 400);
  }

  const admin = createSupabaseAdminClient();

  const { data: form, error: formErr } = await admin
    .from("lead_forms")
    .select(
      "id, location_id, slug, name, schema, settings, active, submission_count, source_channel, source_label",
    )
    .ilike("slug", slug)
    .maybeSingle();
  if (formErr || !form) {
    return json({ error: "Form not found" }, 404);
  }
  if (!form.active) {
    return json({ error: "Form is no longer accepting submissions" }, 410);
  }

  const schema = (form.schema as FormSchema) ?? { rows: [] };
  const settings = (form.settings as FormSettings) ?? {};

  // Honeypot: if the configured honeypot field has a value, silently 200
  // so the bot thinks it succeeded but no lead is created.
  const honeypotKey = settings.honeypotKey ?? "website";
  if (typeof payload[honeypotKey] === "string" && payload[honeypotKey]) {
    return json({ ok: true }, 200);
  }

  const errors = validateSubmission(schema, payload);
  if (errors.length > 0) {
    return json({ error: errors[0].message, errors }, 422);
  }

  // Rate limit per IP.
  const ip = clientIp(request);
  if (ip) {
    const cutoff = new Date(Date.now() - RATE_WINDOW_MS).toISOString();
    const { count } = await admin
      .from("lead_form_submissions")
      .select("id", { count: "exact", head: true })
      .eq("form_id", form.id)
      .eq("ip", ip)
      .gte("created_at", cutoff);
    if ((count ?? 0) >= RATE_MAX) {
      return json({ error: "Too many submissions. Try again later." }, 429);
    }
  }

  const { contact, lead } = mapSubmissionToLead(schema, payload);

  // Find-or-create contact: dedup by email (lower), fall back to creating.
  let contactId: string | null = null;
  if (contact.email) {
    const { data: existing } = await admin
      .from("catering_contacts")
      .select("id")
      .ilike("email", contact.email)
      .maybeSingle();
    if (existing) contactId = existing.id;
  }
  if (!contactId) {
    const { data: created, error: contactErr } = await admin
      .from("catering_contacts")
      .insert({
        full_name: contact.full_name?.trim() || "Inquiry from form",
        email: contact.email ?? null,
        phone: contact.phone ?? null,
        company: contact.company ?? null,
        source: `form:${form.slug}`,
      })
      .select("id")
      .single();
    if (contactErr || !created) {
      return json(
        { error: "Could not record contact" },
        500,
      );
    }
    contactId = created.id;
  }

  // Push the new lead to the top of the "lead" column.
  const { data: topRow } = await admin
    .from("catering_leads")
    .select("pipeline_position")
    .eq("status", "lead")
    .order("pipeline_position", { ascending: true })
    .limit(1)
    .maybeSingle();
  const insertPosition = (topRow?.pipeline_position ?? 0) - 1;

  const formSource = leadSourceFromForm({
    source_channel: form.source_channel as FormSourceChannel,
    source_label: form.source_label,
    name: form.name,
  });

  const { data: createdLead, error: leadErr } = await admin
    .from("catering_leads")
    .insert({
      location_id: form.location_id,
      contact_id: contactId,
      status: "lead",
      pipeline_position: insertPosition,
      event_type: lead.event_type ?? null,
      desired_date: lead.desired_date ?? null,
      party_size: lead.party_size ?? null,
      budget_low_cents: lead.budget_low_cents ?? null,
      budget_high_cents: lead.budget_high_cents ?? null,
      estimated_value_cents: lead.estimated_value_cents ?? null,
      notes: lead.notes ?? null,
      // A field mapped to "source" on the form (e.g. utm_source) wins; otherwise
      // use the form's own attribution label.
      source: lead.source ?? formSource,
      source_form_id: form.id,
    })
    .select("id")
    .single();
  if (leadErr || !createdLead) {
    return json({ error: "Could not record lead" }, 500);
  }

  // Submission row + form counters.
  await admin.from("lead_form_submissions").insert({
    form_id: form.id,
    lead_id: createdLead.id,
    contact_id: contactId,
    payload,
    source_url: body.source_url ?? request.headers.get("referer") ?? null,
    ip,
    user_agent: request.headers.get("user-agent"),
  });

  await admin
    .from("lead_forms")
    .update({
      submission_count: (form.submission_count ?? 0) + 1,
      last_submission_at: new Date().toISOString(),
    })
    .eq("id", form.id);

  return json(
    {
      ok: true,
      successMessage: settings.successMessage ?? null,
      redirectUrl: settings.redirectUrl ?? null,
    },
    200,
  );
}

function clientIp(request: Request): string | null {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip");
}

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

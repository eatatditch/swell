import "server-only";

import Anthropic from "@anthropic-ai/sdk";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface CorpusLesson {
  course_slug: string;
  course_title: string;
  lesson_id: string;
  lesson_slug: string;
  lesson_title: string;
  content: string;
}

/**
 * Pull every active lesson + course title for the corpus. The corpus is
 * stable across requests, so we render it once and let Claude prompt-cache
 * the whole thing.
 */
export async function loadCorpus(): Promise<CorpusLesson[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_lessons")
    .select(
      "id, slug, title, content, course:training_courses(slug, title, is_active)",
    )
    .eq("is_active", true);

  type Row = {
    id: string;
    slug: string;
    title: string;
    content: string | null;
    course: { slug: string; title: string; is_active: boolean } | null;
  };

  return ((data ?? []) as unknown as Row[])
    .filter((r) => r.course?.is_active && r.content)
    .map((r) => ({
      course_slug: r.course!.slug,
      course_title: r.course!.title,
      lesson_id: r.id,
      lesson_slug: r.slug,
      lesson_title: r.title,
      content: r.content!,
    }))
    .sort((a, b) =>
      a.course_title.localeCompare(b.course_title) ||
      a.lesson_title.localeCompare(b.lesson_title),
    );
}

/**
 * Format the corpus into a single Markdown blob that becomes the cached
 * system prompt prefix. The prefix is deterministic — same bytes across
 * requests — so the cache reads consistently.
 */
export function renderCorpus(lessons: CorpusLesson[]): string {
  const sections = lessons.map((l) =>
    [
      `## Lesson: ${l.lesson_title}`,
      `Course: ${l.course_title}`,
      `Citation: [${l.course_title} → ${l.lesson_title}]`,
      "",
      l.content.trim(),
    ].join("\n"),
  );
  return sections.join("\n\n---\n\n");
}

export interface PalomaAnswerChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
  citations?: string[];
}

const SYSTEM_INTRO = `You are Paloma, the SWELL training assistant for Ditch — a restaurant group on Long Island, NY.

You help Ditch staff with three kinds of questions:

1. **Ditch operations** — service standards, menu, opening/closing, safety, alcohol awareness, sales technique. Source from the **Lesson corpus** below.
2. **Ditch business** — who we are, when we were founded, who owns us, how many locations, where we are, how to reach us. Source from the **Ditch knowledge base** below.
3. **General restaurant / food / health knowledge** — allergens (gluten, dairy, shellfish, nuts), celiac disease, Crohn's disease, IBS, food intolerances, what gluten/lactose/casein actually is, common dietary needs (vegan, vegetarian, kosher, halal), wine and spirit basics, kitchen technique, ServSafe / food-handler concepts, generic responsible-service rules. Use your own training-data knowledge for these.

For category #3 (medical conditions or allergies), include a one-line caveat that staff should not give medical advice — direct guests to call out their allergy clearly and trust the manager / chef to handle it.

**Out of scope.** Politely refuse questions unrelated to working at Ditch or restaurant work generally — current events, personal advice, coding, math homework, anything else. Two-sentence redirect, no apology paragraph.

**Voice.** Warm, direct, no corporate hedging. Sound like a confident shift lead, not a chatbot. Short paragraphs. Bullet lists only when the question is genuinely enumerable. Use "we" / "us" for Ditch.

**Citations.**
- For facts from the **Lesson corpus**, end the sentence with the lesson citation in this exact form: \`[Course → Lesson]\`. Use the citation tag shown next to each lesson. Multiple sources allowed: \`[A → B] [C → D]\`.
- For facts from the **Ditch knowledge base**, cite as \`[Ditch KB]\`.
- For general restaurant / food / health knowledge from your training data, cite as \`[General knowledge]\` at the end of the relevant sentence so staff know it isn't from Ditch-authored material.
- If you don't actually know something — especially a Ditch-specific fact not in the corpus or KB — say so plainly. Don't make it up.

`;

function renderKnowledgeBase(kb: string | null): string {
  const safe = (kb ?? "").trim();
  if (!safe) {
    return "## Ditch knowledge base\n\n*(The knowledge base is empty. An admin can fill it in at /admin/settings.)*\n\n";
  }
  return `## Ditch knowledge base\n\n${safe}\n\n`;
}

/**
 * Stream Paloma's answer to a question. Async generator yields chunks the
 * route handler can pipe to the client.
 */
export async function* answerQuestion(
  question: string,
): AsyncGenerator<PalomaAnswerChunk> {
  if (!process.env.ANTHROPIC_API_KEY) {
    yield {
      type: "error",
      text: "Paloma isn't configured yet — ANTHROPIC_API_KEY isn't set in this environment.",
    };
    return;
  }

  const client = new Anthropic();
  const supabase = createSupabaseServerClient();
  const [lessons, { data: settings }] = await Promise.all([
    loadCorpus(),
    supabase
      .from("system_settings")
      .select("assistant_kb")
      .eq("id", 1)
      .maybeSingle(),
  ]);
  if (lessons.length === 0) {
    yield {
      type: "error",
      text: "No training content is loaded yet, so I have nothing to draw from.",
    };
    return;
  }

  const kb = renderKnowledgeBase(
    (settings as { assistant_kb: string | null } | null)?.assistant_kb ?? null,
  );
  const corpus = renderCorpus(lessons);
  const systemPrompt = `${SYSTEM_INTRO}${kb}## Lesson corpus\n\n${corpus}`;

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
        ? `Paloma errored (${err.status}): ${err.message}`
        : err instanceof Error
          ? `Paloma errored: ${err.message}`
          : "Paloma errored.";
    yield { type: "error", text: msg };
  }
}

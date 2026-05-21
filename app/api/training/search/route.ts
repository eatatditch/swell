import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/get-user";
import { answerQuestion } from "@/lib/server/training-search";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Streaming endpoint for Paloma. Emits newline-delimited JSON so the
// client can parse incrementally without a heavy SSE parser.
export async function POST(req: NextRequest) {
  await requireUser();

  let body: { question?: string } = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const question = (body.question ?? "").trim();
  if (!question) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }
  if (question.length > 1000) {
    return NextResponse.json({ error: "question too long" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of answerQuestion(question)) {
          controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "stream failed";
        controller.enqueue(
          encoder.encode(
            JSON.stringify({ type: "error", text: message }) + "\n",
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

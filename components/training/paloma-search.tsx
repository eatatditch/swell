"use client";

import { useRef, useState } from "react";
import { Loader2, Send, Sparkles, X } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PalomaChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
}

const SAMPLE_QUESTIONS = [
  "How long do I have to greet a new table?",
  "What is celiac disease and what foods should a celiac avoid?",
  "Who owns Ditch and when were we founded?",
  "What are the most common food allergies?",
];

export function PalomaSearch() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function ask(q?: string) {
    const final = (q ?? question).trim();
    if (!final || streaming) return;
    setError(null);
    setAnswer("");
    setStreaming(true);
    setQuestion(final);

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/training/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: final }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(body || `${res.status} ${res.statusText}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let chunk: PalomaChunk;
          try {
            chunk = JSON.parse(line);
          } catch {
            continue;
          }
          if (chunk.type === "text" && chunk.text) {
            setAnswer((prev) => prev + chunk.text);
          } else if (chunk.type === "error" && chunk.text) {
            setError(chunk.text);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    stop();
    setQuestion("");
    setAnswer("");
    setError(null);
  }

  return (
    <section
      className={cn(
        "rounded-2xl border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-card to-card p-5 shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-lg font-black">Ask Paloma</h2>
          <p className="text-sm text-muted-foreground">
            Search every lesson with one question. She cites the lesson she
            pulled the answer from.
          </p>
        </div>
        {(answer || error) && !streaming ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={reset}
            aria-label="Clear"
            className="h-8 w-8 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="mt-3 flex gap-2"
      >
        <Input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="What's the cutoff procedure?"
          disabled={streaming}
          className="flex-1"
        />
        {streaming ? (
          <Button type="button" variant="outline" onClick={stop}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </Button>
        ) : (
          <Button
            type="submit"
            variant="accent"
            disabled={!question.trim()}
            className="gap-1.5"
          >
            <Send className="h-4 w-4" />
            Ask
          </Button>
        )}
      </form>

      {!answer && !error && !streaming ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {SAMPLE_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => ask(q)}
              className="rounded-full border border-input bg-card px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive" className="mt-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {answer ? (
        <div className="mt-4 rounded-lg border bg-background/60 p-4">
          <PalomaAnswerText text={answer} />
          {streaming ? (
            <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-accent align-middle" />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

/**
 * Render Paloma's reply with citations highlighted. Three citation shapes
 * get chip styling:
 *   [Course → Lesson]      — lesson corpus (accent)
 *   [Ditch KB]             — knowledge base (primary)
 *   [General knowledge]    — Paloma's own training data (muted)
 */
function PalomaAnswerText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const pattern = /\[([^\]]+)\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const citation = match[1].trim();
    const chip = classifyCitation(citation);
    if (chip) {
      parts.push(
        <span
          key={`cite-${match.index}`}
          className={
            "ml-0.5 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide " +
            chip.className
          }
        >
          {chip.label}
        </span>,
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
      {parts}
    </p>
  );
}

function classifyCitation(
  citation: string,
): { label: string; className: string } | null {
  if (citation.includes("→")) {
    return { label: citation, className: "bg-accent/15 text-accent" };
  }
  const lower = citation.toLowerCase();
  if (lower === "ditch kb" || lower === "kb") {
    return { label: "Ditch KB", className: "bg-primary/15 text-primary" };
  }
  if (lower === "general knowledge" || lower === "general") {
    return {
      label: "General knowledge",
      className: "bg-muted text-muted-foreground",
    };
  }
  return null;
}

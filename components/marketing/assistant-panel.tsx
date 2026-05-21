"use client";

import { useRef, useState } from "react";
import { Send, Sparkles, StopCircle, User } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AssistantPrompt } from "@/lib/data/marketing-sample";

interface Props {
  prompts: AssistantPrompt[];
}

interface Message {
  who: "user" | "wave";
  text: string;
  streaming?: boolean;
  error?: boolean;
}

interface StreamChunk {
  type: "text" | "thinking" | "done" | "error";
  text?: string;
}

export function AssistantPanel({ prompts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      who: "wave",
      text:
        "Hi Tracy. Tap a suggested prompt or type your own. I read every SWELL marketing module — campaigns, content, ads, email/SMS, scorecard, leads, reviews — so I can answer like your marketing director.",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  async function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed || pending) return;
    setInput("");
    setPending(true);

    setMessages((m) => [
      ...m,
      { who: "user", text: trimmed },
      { who: "wave", text: "", streaming: true },
    ]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/marketing/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errText = await res.text();
        appendToWave(errText || `Request failed (${res.status})`, true);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        appendToWave("Stream unavailable.", true);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let chunk: StreamChunk;
          try {
            chunk = JSON.parse(line);
          } catch {
            continue;
          }
          if (chunk.type === "text" && chunk.text) {
            appendToWave(chunk.text);
          } else if (chunk.type === "error" && chunk.text) {
            appendToWave(chunk.text, true);
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        appendToWave(
          err instanceof Error ? err.message : "Something broke.",
          true,
        );
      }
    } finally {
      setMessages((m) =>
        m.map((msg, i) =>
          i === m.length - 1 ? { ...msg, streaming: false } : msg,
        ),
      );
      setPending(false);
      abortRef.current = null;
    }
  }

  function appendToWave(text: string, error = false) {
    setMessages((m) => {
      const copy = m.slice();
      const last = copy[copy.length - 1];
      if (last?.who === "wave") {
        copy[copy.length - 1] = {
          ...last,
          text: last.text + text,
          error: error || last.error,
        };
      }
      return copy;
    });
  }

  function stop() {
    abortRef.current?.abort();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="flex h-[640px] flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" /> Conversation
          </CardTitle>
          <CardDescription>
            Reads from campaigns, content items, ads, the planner, scorecard,
            KPIs, leads, segments, and reviews to answer in context.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <Bubble key={i} message={m} />
            ))}
          </div>
          <form
            className="flex items-center gap-2 border-t pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="What should we promote this week?"
              disabled={pending}
            />
            {pending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={stop}
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                variant="accent"
                disabled={!input.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Try these</CardTitle>
          <CardDescription>Sharp questions Wave answers well.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {prompts.map((p) => (
              <li key={p.prompt}>
                <button
                  type="button"
                  onClick={() => ask(p.prompt)}
                  disabled={pending}
                  className="w-full rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {p.prompt}
                </button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Bubble({ message }: { message: Message }) {
  const isUser = message.who === "user";
  return (
    <div className={isUser ? "flex justify-end" : "flex justify-start"}>
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-tr-sm bg-accent px-3 py-2 text-sm text-accent-foreground"
            : message.error
              ? "flex max-w-[80%] gap-2 rounded-2xl rounded-tl-sm bg-rose-500/10 px-3 py-2 text-sm text-rose-700"
              : "flex max-w-[80%] gap-2 rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2 text-sm"
        }
      >
        {!isUser ? (
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="h-3 w-3" />
          </span>
        ) : null}
        <span className="whitespace-pre-wrap">
          {message.text}
          {message.streaming && !message.text ? (
            <span className="inline-block animate-pulse text-muted-foreground">
              thinking…
            </span>
          ) : null}
          {message.streaming && message.text ? (
            <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-current align-middle" />
          ) : null}
        </span>
        {isUser ? (
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-foreground/15">
            <User className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

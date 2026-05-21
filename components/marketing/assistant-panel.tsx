"use client";

import { useState } from "react";
import { Send, Sparkles, User } from "lucide-react";

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
}

export function AssistantPanel({ prompts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      who: "wave",
      text:
        "Hi Tracy. Tap a suggested prompt or type your own. I read every SWELL module so I can answer like your marketing director.",
    },
  ]);
  const [input, setInput] = useState("");

  function ask(q: string) {
    const trimmed = q.trim();
    if (!trimmed) return;
    const canned = prompts.find(
      (p) => p.prompt.toLowerCase() === trimmed.toLowerCase(),
    );
    const reply =
      canned?.cannedResponse ??
      "I'll be smarter once we wire up the LLM. For now I can answer the prompts on the right.";
    setMessages((m) => [
      ...m,
      { who: "user", text: trimmed },
      { who: "wave", text: reply },
    ]);
    setInput("");
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="flex h-[640px] flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-accent" /> Conversation
          </CardTitle>
          <CardDescription>
            Wave will use the campaign, content, ads, email, SMS, and review
            modules as context once the LLM is wired.
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
            />
            <Button type="submit" size="icon" variant="accent" disabled={!input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Try these</CardTitle>
          <CardDescription>Sample questions Wave can answer.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1.5 text-sm">
            {prompts.map((p) => (
              <li key={p.prompt}>
                <button
                  type="button"
                  onClick={() => ask(p.prompt)}
                  className="w-full rounded-md px-2 py-1.5 text-left hover:bg-muted"
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
            : "flex max-w-[80%] gap-2 rounded-2xl rounded-tl-sm bg-muted/60 px-3 py-2 text-sm"
        }
      >
        {!isUser ? (
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Sparkles className="h-3 w-3" />
          </span>
        ) : null}
        <span className="whitespace-pre-wrap">{message.text}</span>
        {isUser ? (
          <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-foreground/15">
            <User className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </div>
  );
}

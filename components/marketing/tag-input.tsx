"use client";

import { useState } from "react";

import { Label } from "@/components/ui/label";

interface Props {
  value: string[];
  onChange: (v: string[]) => void;
  known: string[];
  label?: string;
  help?: string;
}

export function TagInput({
  value,
  onChange,
  known,
  label = "Tags",
  help,
}: Props) {
  const [input, setInput] = useState("");
  function add(tag: string) {
    const t = tag.trim();
    if (!t || value.includes(t)) return;
    onChange([...value, t]);
    setInput("");
  }
  function remove(t: string) {
    onChange(value.filter((v) => v !== t));
  }
  const suggestions = known.filter((k) => !value.includes(k)).slice(0, 10);
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-background p-2">
        {value.map((t) => (
          <span
            key={t}
            className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent"
          >
            {t}
            <button
              type="button"
              onClick={() => remove(t)}
              className="text-accent/60 hover:text-accent"
              aria-label={`Remove ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            } else if (e.key === "Backspace" && !input && value.length > 0) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder="Type + enter…"
          className="flex-1 min-w-[120px] bg-transparent text-xs outline-none"
        />
      </div>
      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
            Suggested:
          </span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => add(s)}
              className="rounded-full border border-input bg-card px-2 py-0.5 text-[11px] hover:bg-muted"
            >
              {s}
            </button>
          ))}
        </div>
      ) : null}
      {help ? (
        <p className="text-[11px] text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

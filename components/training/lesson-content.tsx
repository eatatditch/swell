import { AlertTriangle, CheckSquare, Info, Lightbulb, Square } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Lesson content renderer. Reads a small superset of Markdown:
 *
 * - `## Heading` and `### Heading`
 * - `- bullets`, `1. numbered`
 * - blank lines = paragraph breaks
 * - inline `**bold**`, `*italic*`
 * - tables (pipe-delimited)
 * - fenced blocks:
 *   - `:::callout note|warn|tip title?` ... `:::`
 *   - `:::steps` ... `:::`            (each numbered item is a step)
 *   - `:::checklist` ... `:::`        (`- [ ]` / `- [x]` lines render as checkboxes)
 *   - `:::takeaway title?` ... `:::`  (the "key takeaway" box)
 *   - `:::compare` <table> `:::`      (side-by-side comparison table)
 *
 * No external markdown lib — lesson content is authored by managers,
 * never user input, so we don't need bulletproof sanitization. The
 * renderer treats unknown HTML as text and escapes via React.
 */
export function LessonContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parse(content);
  return (
    <div
      className={cn(
        "space-y-4 text-sm leading-relaxed text-foreground",
        className,
      )}
    >
      {blocks.map((b, i) => renderBlock(b, i))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

type InlineText = string;

type Block =
  | { kind: "h2"; text: InlineText }
  | { kind: "h3"; text: InlineText }
  | { kind: "ul"; items: InlineText[] }
  | { kind: "ol"; items: InlineText[] }
  | { kind: "p"; text: InlineText }
  | { kind: "table"; head: InlineText[]; rows: InlineText[][] }
  | { kind: "callout"; tone: "note" | "warn" | "tip"; title: string | null; inner: Block[] }
  | { kind: "steps"; items: InlineText[] }
  | { kind: "checklist"; items: { label: string; done: boolean }[] }
  | { kind: "takeaway"; title: string | null; inner: Block[] }
  | { kind: "compare"; head: InlineText[]; rows: InlineText[][] };

function parse(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  return parseScope(lines, 0, null).blocks;
}

/** Parse until we hit a `:::` close at `endMarker` (or EOF). */
function parseScope(
  lines: string[],
  start: number,
  endMarker: string | null,
): { blocks: Block[]; next: number } {
  const blocks: Block[] = [];
  let buf: string[] = [];
  let list: { kind: "ul" | "ol"; items: string[] } | null = null;
  let i = start;

  const flushPara = () => {
    if (buf.length) {
      blocks.push({ kind: "p", text: buf.join("\n") });
      buf = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({ kind: list.kind, items: list.items });
      list = null;
    }
  };
  const flush = () => {
    flushPara();
    flushList();
  };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (endMarker !== null && trimmed === ":::") {
      flush();
      return { blocks, next: i + 1 };
    }

    // Fenced block open.
    const fenceMatch = trimmed.match(/^:::\s*(\w+)(?:\s+(.+))?$/);
    if (fenceMatch) {
      flush();
      const name = fenceMatch[1].toLowerCase();
      const rest = fenceMatch[2]?.trim() ?? "";
      const scope = parseScope(lines, i + 1, ":::");
      i = scope.next;

      if (name === "callout" || name === "note" || name === "warn" || name === "tip") {
        const tone: "note" | "warn" | "tip" =
          name === "warn"
            ? "warn"
            : name === "tip"
              ? "tip"
              : rest.split(/\s+/)[0] === "warn"
                ? "warn"
                : rest.split(/\s+/)[0] === "tip"
                  ? "tip"
                  : "note";
        const title =
          name === "callout" && rest
            ? rest.replace(/^(note|warn|tip)\s*/i, "").trim() || null
            : rest || null;
        blocks.push({ kind: "callout", tone, title, inner: scope.blocks });
      } else if (name === "steps") {
        const items = stepsFromBlocks(scope.blocks);
        blocks.push({ kind: "steps", items });
      } else if (name === "checklist") {
        const items = checklistFromBlocks(scope.blocks);
        blocks.push({ kind: "checklist", items });
      } else if (name === "takeaway" || name === "key-takeaway") {
        blocks.push({ kind: "takeaway", title: rest || null, inner: scope.blocks });
      } else if (name === "compare") {
        const table = scope.blocks.find((b) => b.kind === "table") as
          | Extract<Block, { kind: "table" }>
          | undefined;
        blocks.push({
          kind: "compare",
          head: table?.head ?? [],
          rows: table?.rows ?? [],
        });
      } else {
        // Unknown — render inner as a generic group.
        blocks.push(...scope.blocks);
      }
      continue;
    }

    // Headings.
    if (trimmed.startsWith("## ")) {
      flush();
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      i += 1;
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flush();
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      i += 1;
      continue;
    }

    // Tables. A table is two-or-more pipe-rows where the second is a divider.
    if (line.startsWith("|") && i + 1 < lines.length && /^\|[\s\-:|]+\|?$/.test(lines[i + 1].trim())) {
      flush();
      const head = splitRow(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    // Lists.
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushPara();
      if (!list || list.kind !== "ul") {
        flushList();
        list = { kind: "ul", items: [] };
      }
      list.items.push(ulMatch[1]);
      i += 1;
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushPara();
      if (!list || list.kind !== "ol") {
        flushList();
        list = { kind: "ol", items: [] };
      }
      list.items.push(olMatch[1]);
      i += 1;
      continue;
    }

    if (trimmed === "") {
      flush();
      i += 1;
      continue;
    }

    flushList();
    buf.push(trimmed);
    i += 1;
  }

  flush();
  return { blocks, next: i };
}

function splitRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function stepsFromBlocks(blocks: Block[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.kind === "ol" || b.kind === "ul") out.push(...b.items);
    else if (b.kind === "p") {
      for (const line of b.text.split("\n")) {
        const m = line.match(/^\d+\.\s+(.+)$/);
        if (m) out.push(m[1]);
        else if (line.trim()) out.push(line.trim());
      }
    }
  }
  return out;
}

function checklistFromBlocks(
  blocks: Block[],
): { label: string; done: boolean }[] {
  const out: { label: string; done: boolean }[] = [];
  for (const b of blocks) {
    if (b.kind !== "ul" && b.kind !== "ol") continue;
    for (const item of b.items) {
      const m = item.match(/^\[( |x|X)\]\s+(.+)$/);
      if (m) {
        out.push({ label: m[2], done: m[1].toLowerCase() === "x" });
      } else {
        out.push({ label: item, done: false });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Renderers
// ---------------------------------------------------------------------------

function renderBlock(block: Block, key: number | string): React.ReactNode {
  switch (block.kind) {
    case "h2":
      return (
        <h2
          key={key}
          className="mt-6 font-display text-xl font-black tracking-tight"
        >
          {renderInline(block.text)}
        </h2>
      );
    case "h3":
      return (
        <h3 key={key} className="mt-4 font-display text-base font-bold">
          {renderInline(block.text)}
        </h3>
      );
    case "ul":
      return (
        <ul key={key} className="list-disc space-y-1 pl-5">
          {block.items.map((line, j) => (
            <li key={j}>{renderInline(line)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="list-decimal space-y-1 pl-5">
          {block.items.map((line, j) => (
            <li key={j}>{renderInline(line)}</li>
          ))}
        </ol>
      );
    case "p":
      return (
        <p key={key} className="whitespace-pre-wrap">
          {renderInline(block.text)}
        </p>
      );
    case "table":
      return (
        <div key={key} className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {block.head.map((cell, j) => (
                  <th key={j} className="px-3 py-2 text-left font-semibold">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, j) => (
                <tr key={j} className="border-b border-border last:border-0">
                  {row.map((cell, k) => (
                    <td key={k} className="px-3 py-2 align-top">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "callout": {
      const tone =
        block.tone === "warn"
          ? "border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30"
          : block.tone === "tip"
            ? "border-primary/40 bg-primary/5"
            : "border-accent/40 bg-accent/5";
      const Icon =
        block.tone === "warn"
          ? AlertTriangle
          : block.tone === "tip"
            ? Lightbulb
            : Info;
      const toneText =
        block.tone === "warn"
          ? "text-amber-700 dark:text-amber-200"
          : block.tone === "tip"
            ? "text-primary"
            : "text-accent";
      return (
        <aside
          key={key}
          className={cn("flex gap-3 rounded-lg border-l-4 p-4", tone)}
        >
          <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", toneText)} />
          <div className="min-w-0 flex-1 space-y-2">
            {block.title ? (
              <p className={cn("font-semibold", toneText)}>{block.title}</p>
            ) : null}
            {block.inner.map((b, j) => renderBlock(b, j))}
          </div>
        </aside>
      );
    }
    case "steps":
      return (
        <ol key={key} className="space-y-2">
          {block.items.map((step, j) => (
            <li key={j} className="flex gap-3 rounded-lg border bg-card p-3">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                {j + 1}
              </span>
              <div className="min-w-0 flex-1">{renderInline(step)}</div>
            </li>
          ))}
        </ol>
      );
    case "checklist":
      return (
        <ul key={key} className="space-y-1.5">
          {block.items.map((item, j) => (
            <li
              key={j}
              className={cn(
                "flex items-start gap-2 text-sm",
                item.done && "text-muted-foreground line-through",
              )}
            >
              {item.done ? (
                <CheckSquare className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              ) : (
                <Square className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span>{renderInline(item.label)}</span>
            </li>
          ))}
        </ul>
      );
    case "takeaway":
      return (
        <aside
          key={key}
          className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-5"
        >
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="h-4 w-4" />
            <span className="text-xs font-bold uppercase tracking-wide">
              {block.title ?? "Key takeaway"}
            </span>
          </div>
          <div className="mt-2 font-display text-base font-bold leading-snug text-foreground">
            {block.inner.map((b, j) => renderBlock(b, j))}
          </div>
        </aside>
      );
    case "compare":
      return (
        <div key={key} className="grid gap-3 sm:grid-cols-2">
          {block.head.map((label, j) => (
            <div key={j} className="rounded-lg border bg-card p-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-accent">
                {renderInline(label)}
              </p>
              <ul className="space-y-1.5 text-sm">
                {block.rows
                  .map((r) => r[j])
                  .filter(Boolean)
                  .map((cell, k) => (
                    <li key={k}>{renderInline(cell)}</li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      );
  }
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = "";
  const flush = () => {
    if (buf) {
      parts.push(buf);
      buf = "";
    }
  };
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        flush();
        parts.push(<strong key={parts.length}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1) {
        flush();
        parts.push(<em key={parts.length}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end > i + 1) {
        flush();
        parts.push(
          <code
            key={parts.length}
            className="rounded bg-muted px-1.5 py-0.5 text-[0.85em] font-mono"
          >
            {text.slice(i + 1, end)}
          </code>,
        );
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  flush();
  return parts;
}

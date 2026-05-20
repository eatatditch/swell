import { cn } from "@/lib/utils";

/**
 * Minimal Markdown-ish renderer. We do not pull in a markdown lib —
 * lesson content is authored by managers, displayed as-is. Supports:
 *
 * - `## Heading` and `### Heading`
 * - `- bullets` and `1. numbered`
 * - blank lines as paragraph breaks
 * - `**bold**` and `*italic*` inline
 *
 * Anything fancier goes in lesson resources or the video URL.
 */
export function LessonContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  const blocks = parseBlocks(content);

  return (
    <div
      className={cn(
        "prose-like space-y-4 text-sm leading-relaxed text-foreground",
        className,
      )}
    >
      {blocks.map((block, i) => {
        if (block.kind === "h2") {
          return (
            <h2
              key={i}
              className="mt-6 font-display text-xl font-black tracking-tight"
            >
              {renderInline(block.text)}
            </h2>
          );
        }
        if (block.kind === "h3") {
          return (
            <h3
              key={i}
              className="mt-4 font-display text-base font-bold"
            >
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.kind === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {block.items.map((line, j) => (
                <li key={j}>{renderInline(line)}</li>
              ))}
            </ul>
          );
        }
        if (block.kind === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-5">
              {block.items.map((line, j) => (
                <li key={j}>{renderInline(line)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { kind: "h2"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "p"; text: string };

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let buffer: string[] = [];
  let listItems: string[] | null = null;
  let listKind: "ul" | "ol" | null = null;

  function flushParagraph() {
    if (buffer.length > 0) {
      blocks.push({ kind: "p", text: buffer.join("\n") });
      buffer = [];
    }
  }
  function flushList() {
    if (listItems && listKind) {
      blocks.push({ kind: listKind, items: listItems });
    }
    listItems = null;
    listKind = null;
  }

  for (const raw of lines) {
    const line = raw;
    const trimmed = line.trim();

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h2", text: trimmed.slice(3) });
      continue;
    }
    if (trimmed.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "h3", text: trimmed.slice(4) });
      continue;
    }
    const ulMatch = trimmed.match(/^[-*]\s+(.+)$/);
    if (ulMatch) {
      flushParagraph();
      if (listKind !== "ul") {
        flushList();
        listKind = "ul";
        listItems = [];
      }
      listItems!.push(ulMatch[1]);
      continue;
    }
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      flushParagraph();
      if (listKind !== "ol") {
        flushList();
        listKind = "ol";
        listItems = [];
      }
      listItems!.push(olMatch[1]);
      continue;
    }
    if (trimmed === "") {
      flushParagraph();
      flushList();
      continue;
    }
    flushList();
    buffer.push(trimmed);
  }
  flushParagraph();
  flushList();

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  // Bold then italic. Tokenize with a small state machine so nesting works.
  const parts: React.ReactNode[] = [];
  let i = 0;
  let buf = "";
  function pushBuf() {
    if (buf) {
      parts.push(buf);
      buf = "";
    }
  }
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end > i + 2) {
        pushBuf();
        parts.push(<strong key={parts.length}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end > i + 1) {
        pushBuf();
        parts.push(<em key={parts.length}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    buf += text[i];
    i += 1;
  }
  pushBuf();
  return parts;
}

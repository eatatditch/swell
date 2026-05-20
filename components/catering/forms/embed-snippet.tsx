"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface EmbedSnippetProps {
  slug: string;
  appUrl: string;
}

export function EmbedSnippet({ slug, appUrl }: EmbedSnippetProps) {
  const [copiedEmbed, setCopiedEmbed] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const embedSnippet = `<script src="${appUrl}/embed.js" data-form="${slug}" async></script>`;
  const hostedLink = `${appUrl}/f/${slug}`;

  async function copy(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 1500);
    } catch {
      /* no-op */
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Embed snippet
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Paste this once on the page where you want the form to appear. Works
          in any HTML — Webflow, Squarespace, WordPress, raw site.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="block flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
            {embedSnippet}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(embedSnippet, setCopiedEmbed)}
          >
            {copiedEmbed ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Hosted link
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Direct link to the form (useful for emails / social).
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="block flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 text-xs">
            {hostedLink}
          </code>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => copy(hostedLink, setCopiedLink)}
          >
            {copiedLink ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

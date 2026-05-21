import { Sparkles } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { AssistantPanel } from "@/components/marketing/assistant-panel";
import { ASSISTANT_PROMPTS } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

export default async function MarketingAssistantPage() {
  return (
    <>
      <PageHeader
        title="Wave — your marketing assistant"
        description="Ask the questions you'd ask a sharp marketing director. Wave reads SWELL live."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent">
            <Sparkles className="h-3 w-3" /> Powered by Claude
          </span>
        }
      />
      <AssistantPanel prompts={ASSISTANT_PROMPTS} />
    </>
  );
}

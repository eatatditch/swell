import { Anchor, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const VALUES: { number: number; title: string; body: string }[] = [
  {
    number: 1,
    title: "The Experience Is Sacred",
    body: "Every guest touchpoint matters. Food, drinks, music, service, cleanliness, timing, and energy all shape the guest experience.",
  },
  {
    number: 2,
    title: "Build With Intention",
    body: "Nothing is random. Menu, pricing, design, training, events, and messaging should all support the brand.",
  },
  {
    number: 3,
    title: "People Over Shortcuts",
    body: "Guests, staff, managers, and community come before convenience. Hospitality starts with how we treat people.",
  },
  {
    number: 4,
    title: "Standards Create Freedom",
    body: "Strong systems protect consistency, strengthen execution, and allow the experience to scale without losing its soul.",
  },
  {
    number: 5,
    title: "Energy Is Contagious",
    body: "The room should feel alive. Staff energy becomes guest energy, and guest energy becomes brand energy.",
  },
  {
    number: 6,
    title: "Earned, Not Given",
    body: "Trust, opportunity, leadership, and loyalty are earned through behavior, consistency, and accountability.",
  },
  {
    number: 7,
    title: "Growth Without Erosion",
    body: "Scale only matters if the spirit of Ditch survives the growth. We build bigger without becoming worse.",
  },
];

export function BrandPurposePanel() {
  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Anchor className="h-3.5 w-3.5" />
            Ditch · Purpose &amp; brand values
          </div>
          <CardTitle className="font-display text-3xl font-bold text-primary">
            Good food. Good people. Good vibes.
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div className="border-l-4 border-accent pl-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Purpose
              </p>
              <p className="mt-2 font-display text-lg leading-snug">
                Ditch exists to create places people feel connected to —{" "}
                <span className="text-muted-foreground">
                  to the food, the people they&apos;re with, and the moment
                  they&apos;re in.
                </span>
              </p>
            </div>
            <p className="self-center text-sm text-muted-foreground">
              These are the rails the brand runs on. Every priority below,
              every decision logged, every cash call — judged against these.
              If we drift, we ask: which one are we breaking?
            </p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
          <Sparkles className="h-4 w-4 text-accent" />
          Brand values
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {VALUES.map((v) => (
            <Card key={v.number} className="border-border">
              <CardContent className="flex items-start gap-3 p-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 font-display text-base font-bold text-accent">
                  {v.number}
                </span>
                <div>
                  <p className="font-display font-bold leading-tight text-primary">
                    {v.title}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {v.body}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-accent px-6 py-5 text-center font-display text-xl font-bold italic tracking-tight text-accent-foreground">
        Build it to last. Run it like it matters.
      </div>
    </div>
  );
}

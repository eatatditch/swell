"use client";

import { useState } from "react";
import { Sparkles, Wand2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  VOICE_MODES,
  VOICE_OUTPUTS,
  VOICE_SAMPLES,
} from "@/lib/data/marketing-sample";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function VoicePage() {
  const [mode, setMode] = useState<(typeof VOICE_MODES)[number]>(VOICE_MODES[0]);
  const [output, setOutput] = useState<(typeof VOICE_OUTPUTS)[number]>(
    VOICE_OUTPUTS[0],
  );

  const sampleKey = `${mode}:${output}`;
  const sample = VOICE_SAMPLES[sampleKey];

  return (
    <div>
      <PageHeader
        title="Brand Voice"
        description="Pick a mode and an output type. Get a draft in the Ditch voice you can paste anywhere."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>
          <CardContent className="space-y-6 p-5">
            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Mode
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                How should it sound?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {VOICE_MODES.map((m) => {
                  const active = m === mode;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMode(m)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="font-display text-base font-bold text-foreground">
                Output type
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Where will it live?
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {VOICE_OUTPUTS.map((o) => {
                  const active = o === output;
                  return (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOutput(o)}
                      className={cn(
                        "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                        active
                          ? "border-accent bg-accent text-accent-foreground"
                          : "border-border bg-card text-foreground hover:bg-muted",
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Button>
                <Sparkles className="mr-1.5 h-4 w-4" />
                Generate
              </Button>
              <Button variant="outline">
                <Wand2 className="mr-1.5 h-4 w-4" />
                Too cringe?
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Sample output
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {mode} · {output}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent/15 text-accent">
                Preview
              </span>
            </div>

            <div className="min-h-[180px] rounded-xl border border-border bg-muted/40 p-5">
              {sample ? (
                <p className="text-base leading-relaxed text-foreground">
                  {sample}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No sample yet — generate placeholder.
                </p>
              )}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Samples are pre-written examples of the Ditch voice. The full
              generator will pull from the brand voice doc + recent winning
              posts.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

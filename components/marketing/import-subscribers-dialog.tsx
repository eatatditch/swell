"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { importSubscribersCsv } from "@/components/marketing/subscriber-actions";
import { TagInput } from "@/components/marketing/tag-input";

interface Props {
  knownTags: string[];
}

export function ImportSubscribersDialog({ knownTags }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState("");
  const [defaultTags, setDefaultTags] = useState<string[]>([]);
  const [defaultSource, setDefaultSource] = useState("csv import");
  const [optInEmail, setOptInEmail] = useState(true);
  const [optInSms, setOptInSms] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsv(text);
  }

  function submit() {
    setError(null);
    setResult(null);
    if (!csv.trim()) {
      setError("Paste a CSV or pick a file.");
      return;
    }
    startTransition(async () => {
      const res = await importSubscribersCsv({
        csv,
        defaultTags,
        defaultSource,
        optInEmail,
        optInSms,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      if (!("inserted" in res)) return;
      const summary = `Inserted ${res.inserted} · updated ${res.updated} · skipped ${res.skipped}`;
      setResult(
        res.errors.length > 0
          ? `${summary}. Errors: ${res.errors.join("; ")}`
          : summary,
      );
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Import subscribers from CSV</DialogTitle>
          <DialogDescription>
            Headers required: at least one of <code>email</code> or{" "}
            <code>phone</code>. Optional: <code>name</code>, <code>tags</code>{" "}
            (semicolon-separated). Duplicates merge tags onto the existing row.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="csv-file">Pick a file</Label>
            <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFile} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="csv-text">…or paste</Label>
            <Textarea
              id="csv-text"
              rows={8}
              className="font-mono text-xs"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              placeholder={`name,email,phone,tags
Jane Doe,jane@example.com,(555) 555-5555,surf_club;bay_shore
…`}
            />
          </div>
          <TagInput
            value={defaultTags}
            onChange={setDefaultTags}
            known={knownTags}
            label="Default tags (applied to every row)"
          />
          <div className="space-y-2">
            <Label htmlFor="csv-source">Source</Label>
            <Input
              id="csv-source"
              value={defaultSource}
              onChange={(e) => setDefaultSource(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={optInEmail}
                onChange={(e) => setOptInEmail(e.target.checked)}
                className="h-4 w-4"
              />
              Treat as email opt-in
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={optInSms}
                onChange={(e) => setOptInSms(e.target.checked)}
                className="h-4 w-4"
              />
              Treat as SMS opt-in (only check if you have real consent)
            </label>
          </div>
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
          {result ? (
            <Alert>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
          <Button variant="accent" onClick={submit} disabled={pending}>
            {pending ? "Importing…" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Loader2 } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AvatarUploaderProps {
  currentUrl: string | null;
  fallback: string;
  uploadAction: (formData: FormData) => Promise<{ url: string } | { error: string }>;
}

export function AvatarUploader({
  currentUrl,
  fallback,
  uploadAction,
}: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(currentUrl);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const fd = new FormData();
    fd.append("avatar", file);
    startTransition(async () => {
      const res = await uploadAction(fd);
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setUrl(res.url);
    });
    e.target.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className="h-20 w-20">
          {url ? <AvatarImage src={url} alt="Avatar" /> : null}
          <AvatarFallback className="text-xl">{fallback}</AvatarFallback>
        </Avatar>
        {pending ? (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/60">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => inputRef.current?.click()}
          disabled={pending}
        >
          <Camera className="h-4 w-4" />
          {url ? "Change photo" : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground">JPG or PNG, up to 5 MB.</p>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}

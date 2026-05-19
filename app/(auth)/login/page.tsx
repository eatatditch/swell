import { Waves, AlertTriangle } from "lucide-react";

import { LoginForm } from "@/components/auth/login-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env";

interface PageProps {
  searchParams: { next?: string; error?: string };
}

const ERROR_LABELS: Record<string, string> = {
  missing_profile:
    "Your account is set up but missing a profile. Ask an admin to invite you again.",
};

export default function LoginPage({ searchParams }: PageProps) {
  const configured = isSupabaseConfigured();
  const errorLabel = searchParams.error
    ? (ERROR_LABELS[searchParams.error] ?? "Something went wrong. Please try again.")
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <Waves className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-semibold tracking-tight">SWELL</h1>
          <p className="text-sm text-muted-foreground">
            Ditch&apos;s internal operating system.
          </p>
        </div>

        {!configured ? (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Setup required</AlertTitle>
            <AlertDescription className="space-y-2 text-sm">
              <p>
                SWELL can&apos;t reach Supabase. Set these environment
                variables on the deployment, then redeploy:
              </p>
              <ul className="ml-4 list-disc font-mono text-xs">
                <li>NEXT_PUBLIC_SUPABASE_URL</li>
                <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
                <li>SUPABASE_SERVICE_ROLE_KEY (server-only)</li>
              </ul>
              <p className="text-xs">
                On Vercel: Project → Settings → Environment Variables.
              </p>
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="rounded-lg border bg-card p-6 shadow-sm">
          {errorLabel ? (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{errorLabel}</AlertDescription>
            </Alert>
          ) : null}
          <LoginForm next={searchParams.next} disabled={!configured} />
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Access is by invite. Contact your admin if you need an account.
        </p>
      </div>
    </div>
  );
}

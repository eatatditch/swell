import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SettingsCard } from "@/components/catering/settings/settings-card";
import { requireUser } from "@/lib/auth/get-user";
import { listSettings } from "@/lib/server/catering-settings";
import { stripeConfigured } from "@/lib/stripe/client";

interface PageProps {
  searchParams: { stripe_connected?: string; stripe_error?: string };
}

export default async function CateringSettingsPage({
  searchParams,
}: PageProps) {
  const { locations, profile } = await requireUser();
  const stripe = stripeConfigured();

  const cateringLocations = locations.filter(
    (l) => l.slug !== "company_wide",
  );

  const all = await listSettings();
  const byLocation = new Map(
    all.filter((s) => s.location_id).map((s) => [s.location_id as string, s]),
  );

  const canManage =
    profile.role === "founder_admin" || profile.role === "catering_manager";

  return (
    <>
      <PageHeader
        title="Catering settings"
        description="Per-location defaults and Stripe Connect."
      />

      {searchParams.stripe_connected ? (
        <Alert className="mb-4">
          <AlertDescription>
            Stripe account connected. If charges aren&apos;t enabled yet,
            finish onboarding from your Stripe dashboard.
          </AlertDescription>
        </Alert>
      ) : null}
      {searchParams.stripe_error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Stripe Connect error: {searchParams.stripe_error}
          </AlertDescription>
        </Alert>
      ) : null}

      {!stripe.configured ? (
        <Alert className="mb-4">
          <AlertDescription>
            <p className="font-medium">Stripe Connect is not configured.</p>
            <p className="text-sm">
              Set <code>STRIPE_SECRET_KEY</code>,{" "}
              <code>STRIPE_CONNECT_CLIENT_ID</code>, and{" "}
              <code>STRIPE_WEBHOOK_SECRET</code> in the environment, plus{" "}
              <code>NEXT_PUBLIC_APP_URL</code> for the callback URL.
              Configure the webhook endpoint at{" "}
              <code className="rounded bg-muted px-1">
                /api/webhooks/stripe
              </code>{" "}
              in the Stripe dashboard with events{" "}
              <code>checkout.session.completed</code>,{" "}
              <code>checkout.session.expired</code>, and{" "}
              <code>account.updated</code>.
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {!canManage ? (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You need the founder or catering manager role to change these settings.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-4">
        {cateringLocations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No locations configured.{" "}
            <Link
              href="/admin/locations"
              className="text-accent underline-offset-2 hover:underline"
            >
              Add one in admin
            </Link>
            .
          </p>
        ) : (
          cateringLocations.map((loc) => (
            <SettingsCard
              key={loc.id}
              location={loc}
              settings={byLocation.get(loc.id) ?? null}
              stripeConfigured={stripe.configured}
            />
          ))
        )}
      </div>
    </>
  );
}

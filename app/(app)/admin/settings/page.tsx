import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { AssistantKbForm } from "@/components/admin/settings/assistant-kb-form";
import { BrandForm } from "@/components/admin/settings/brand-form";
import { HoursForm } from "@/components/admin/settings/hours-form";
import { StripeSummary } from "@/components/admin/settings/stripe-summary";
import { requireAdmin } from "@/lib/auth/get-user";
import {
  getLocationsWithHours,
  getStripeConnectionsByLocation,
  getSystemSettings,
} from "@/lib/server/settings";

export default async function AdminSettingsPage() {
  await requireAdmin();
  const [settings, locationsWithHours, stripe] = await Promise.all([
    getSystemSettings(),
    getLocationsWithHours(),
    getStripeConnectionsByLocation(),
  ]);

  if (!settings) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            System settings row is missing. Refresh after running the latest
            migration.
          </p>
        </CardContent>
      </Card>
    );
  }

  const locations = locationsWithHours
    .filter((l) => l.slug !== "company_wide")
    .map(({ hours: _hours, ...l }) => l);

  return (
    <Tabs defaultValue="brand" className="space-y-4">
      <TabsList>
        <TabsTrigger value="brand">Brand &amp; Email</TabsTrigger>
        <TabsTrigger value="hours">Hours</TabsTrigger>
        <TabsTrigger value="billing">Stripe</TabsTrigger>
        <TabsTrigger value="paloma">Paloma KB</TabsTrigger>
      </TabsList>

      <TabsContent value="brand">
        <Card>
          <CardHeader>
            <CardTitle>Brand, email, and billing defaults</CardTitle>
            <CardDescription>
              System-wide settings used across customer-facing pages and
              outbound mail.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandForm settings={settings} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="hours">
        <div className="space-y-4">
          {locationsWithHours
            .filter((l) => l.slug !== "company_wide")
            .map((l) => (
              <Card key={l.id}>
                <CardHeader>
                  <CardTitle>{l.name}</CardTitle>
                  <CardDescription>Hours of operation by day.</CardDescription>
                </CardHeader>
                <CardContent>
                  <HoursForm location={l} />
                </CardContent>
              </Card>
            ))}
        </div>
      </TabsContent>

      <TabsContent value="billing">
        <Card>
          <CardHeader>
            <CardTitle>Stripe connections</CardTitle>
            <CardDescription>
              Each location holds its own Stripe account so payouts land in
              the right bank. Configure full Connect onboarding under
              Catering → Settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StripeSummary locations={locations} settings={stripe} />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="paloma">
        <Card>
          <CardHeader>
            <CardTitle>Paloma&apos;s knowledge base</CardTitle>
            <CardDescription>
              Ditch business facts Paloma uses to answer questions on
              /training. Goes alongside lesson content, not instead of it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssistantKbForm settings={settings} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

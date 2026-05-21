import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MENU_PROFILES, type MenuMarketingProfile } from "@/lib/data/marketing-sample";

export const dynamic = "force-dynamic";

function adWorthinessTone(score: number): string {
  if (score >= 85) return "bg-emerald-500/15 text-emerald-700";
  if (score >= 70) return "bg-accent/15 text-accent";
  return "bg-amber-500/15 text-amber-700";
}

function ProfileCard({ profile }: { profile: MenuMarketingProfile }) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">
              {profile.name}
            </h3>
            <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              {profile.bestDaypart} · {profile.bestGuestType}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${adWorthinessTone(
              profile.adWorthiness,
            )}`}
          >
            Ad {profile.adWorthiness}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Price
            </div>
            <div className="font-semibold tabular-nums text-foreground">
              ${profile.price.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              Margin
            </div>
            <div className="font-semibold tabular-nums text-foreground">
              {profile.marginPct}%
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
            <span>Popularity</span>
            <span className="tabular-nums">{profile.popularity}</span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${profile.popularity}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-muted/60 px-3 py-2 text-sm">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Best angle
          </div>
          <div className="mt-0.5 text-foreground">{profile.bestAngle}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {profile.bestFormat} · pair with {profile.bestPairing}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProfileGrid({ items }: { items: MenuMarketingProfile[] }) {
  const sorted = [...items].sort((a, b) => b.popularity - a.popularity);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((p) => (
        <ProfileCard key={p.name} profile={p} />
      ))}
    </div>
  );
}

export default function MenuProfilesPage() {
  const food = MENU_PROFILES.filter((p) => p.category === "food");
  const drinks = MENU_PROFILES.filter((p) => p.category === "drink");

  return (
    <div>
      <PageHeader
        title="Menu Marketing"
        description="Every item with its best marketing angle — sorted by popularity. Use this to pick what to push."
      />

      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All ({MENU_PROFILES.length})</TabsTrigger>
          <TabsTrigger value="food">Food ({food.length})</TabsTrigger>
          <TabsTrigger value="drinks">Drinks ({drinks.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <ProfileGrid items={MENU_PROFILES} />
        </TabsContent>
        <TabsContent value="food">
          <ProfileGrid items={food} />
        </TabsContent>
        <TabsContent value="drinks">
          <ProfileGrid items={drinks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

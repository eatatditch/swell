import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
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
import { CommentThread } from "@/components/comments/comment-thread";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { EventStatusBadge } from "@/components/catering/status-badges";
import { EventBEOView } from "@/components/catering/events/event-beo-view";
import { EventStatusControls } from "@/components/catering/events/event-status-controls";
import { PaymentSummary } from "@/components/catering/events/payment-summary";
import { MenuEditor } from "@/components/catering/menu/menu-editor";
import { PaymentList } from "@/components/catering/payments/payment-list";
import { UgcList } from "@/components/catering/ugc/ugc-list";
import { ReviewRequestList } from "@/components/catering/reviews/review-request-list";
import { requireUser } from "@/lib/auth/get-user";
import {
  getEvent,
  listMenuItems,
  listPayments,
  listReviewRequests,
  listUgc,
  paymentTotals,
} from "@/lib/server/catering";
import {
  formatEventDate,
  formatTime,
  SERVICE_TYPE_LABELS,
} from "@/lib/constants/catering";

interface PageProps {
  params: { id: string };
}

const MANAGER_ROLES = [
  "founder_admin",
  "general_manager",
  "service_manager",
  "kitchen_manager",
  "catering_manager",
] as const;

export default async function EventDetailPage({ params }: PageProps) {
  const { profile } = await requireUser();
  const event = await getEvent(params.id);
  if (!event) notFound();

  const [menuItems, payments, ugc, reviews] = await Promise.all([
    listMenuItems(event.id),
    listPayments(event.id),
    listUgc(event.id),
    listReviewRequests(event.id),
  ]);

  const totals = paymentTotals(event, payments);
  const canRecordPayments = (MANAGER_ROLES as readonly string[]).includes(
    profile.role,
  );
  const canDelete =
    event.created_by === profile.id || profile.role === "founder_admin";

  return (
    <>
      <PageHeader
        title={event.title}
        description={
          `${formatEventDate(event.event_date)}` +
          (event.start_time ? ` · ${formatTime(event.start_time)}` : "") +
          (event.location ? ` · ${event.location.name}` : "") +
          ` · ${SERVICE_TYPE_LABELS[event.service_type]}`
        }
        action={
          <div className="flex items-center gap-2">
            <EventStatusBadge status={event.status} />
            {event.lead_id ? (
              <Link
                href={`/catering/leads/${event.lead_id}`}
                className="text-xs text-muted-foreground underline-offset-2 hover:underline"
              >
                ← lead
              </Link>
            ) : null}
          </div>
        }
      />

      <div className="mb-4 print:hidden">
        <EventStatusControls
          eventId={event.id}
          status={event.status}
          guestCount={event.guest_count}
          canDelete={canDelete}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="flex w-full max-w-3xl flex-wrap">
              <TabsTrigger value="overview" className="flex-1 min-w-24">
                BEO
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex-1 min-w-24">
                Menu
              </TabsTrigger>
              <TabsTrigger value="payments" className="flex-1 min-w-24">
                Payments
              </TabsTrigger>
              <TabsTrigger value="ugc" className="flex-1 min-w-24">
                UGC
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-1 min-w-24">
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <EventBEOView event={event} menuItems={menuItems} />
            </TabsContent>

            <TabsContent value="menu">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Menu line items</CardTitle>
                  <CardDescription>
                    Build the priced rundown.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MenuEditor eventId={event.id} items={menuItems} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payments</CardTitle>
                  <CardDescription>
                    Deposits, balance, gratuity, refunds.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PaymentList
                    eventId={event.id}
                    payments={payments}
                    canRecord={canRecordPayments}
                    currentUserId={profile.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ugc">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">UGC opportunities</CardTitle>
                  <CardDescription>
                    Photos, reels, features, tags — what marketing should plan
                    for.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UgcList
                    eventId={event.id}
                    items={ugc}
                    currentUserId={profile.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Review tracking</CardTitle>
                  <CardDescription>
                    Post-event review requests and responses.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ReviewRequestList
                    eventId={event.id}
                    items={reviews}
                    currentUserId={profile.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Comments</CardTitle>
              <CardDescription>Internal discussion on this event.</CardDescription>
            </CardHeader>
            <CardContent>
              <CommentThread
                parentType="catering_event"
                parentId={event.id}
                locationId={event.location_id}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 print:hidden">
          <PaymentSummary totals={totals} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityFeed
                objectType="catering_event"
                objectId={event.id}
                limit={20}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

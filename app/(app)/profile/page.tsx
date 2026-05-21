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
import { ProfileForm } from "@/components/profile/profile-form";
import { NotificationPrefsForm } from "@/components/profile/notification-prefs-form";
import { PasswordForm } from "@/components/profile/password-form";
import { requireUser } from "@/lib/auth/get-user";
import { getMyNotificationPreferences } from "@/lib/server/profile";

export default async function ProfilePage() {
  const { profile } = await requireUser();
  const prefs = await getMyNotificationPreferences();

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Personal info, notification preferences, and password."
      />

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Your details</CardTitle>
              <CardDescription>
                These show up on your team profile, in @mentions, and on items
                you create.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm profile={profile} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Email notifications</CardTitle>
              <CardDescription>
                Decide which platform events should ping you by email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prefs ? (
                <NotificationPrefsForm prefs={prefs} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Couldn&apos;t load your preferences. Refresh the page.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="password">
          <Card>
            <CardHeader>
              <CardTitle>Change password</CardTitle>
              <CardDescription>
                Sets a new password for sign-in. You&apos;ll stay signed in on
                this device.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

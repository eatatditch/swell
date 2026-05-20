import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InviteUserForm } from "@/components/admin/users/invite-user-form";
import { requireAdmin } from "@/lib/auth/get-user";
import { listAllLocationsForAssignment } from "@/lib/server/users";

export default async function InviteUserPage() {
  await requireAdmin();
  const locations = await listAllLocationsForAssignment();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite a user</CardTitle>
        <CardDescription>
          We&apos;ll email them a magic link so they can set their own
          password. You can fill in the rest of their profile here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <InviteUserForm locations={locations} />
      </CardContent>
    </Card>
  );
}

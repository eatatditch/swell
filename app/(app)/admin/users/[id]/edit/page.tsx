import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EditUserForm } from "@/components/admin/users/edit-user-form";
import { requireAdmin } from "@/lib/auth/get-user";
import { getAdminUser, listAllLocationsForAssignment } from "@/lib/server/users";

interface PageProps {
  params: { id: string };
}

export default async function EditUserPage({ params }: PageProps) {
  await requireAdmin();
  const [user, locations] = await Promise.all([
    getAdminUser(params.id),
    listAllLocationsForAssignment(),
  ]);
  if (!user) notFound();

  const subtitle = user.has_logged_in
    ? user.last_sign_in_at
      ? `Last seen ${new Date(user.last_sign_in_at).toLocaleString()}`
      : "Active"
    : "Hasn't signed in yet — invite is pending";

  return (
    <Card>
      <CardHeader>
        <CardTitle>{user.full_name ?? user.email ?? "User"}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <EditUserForm user={user} locations={locations} />
      </CardContent>
    </Card>
  );
}

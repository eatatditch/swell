import Link from "next/link";
import { UserPlus, Users } from "lucide-react";

import { EmptyState } from "@/components/data/empty-state";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { UserRowActions } from "@/components/admin/users/user-row-actions";
import { requireAdmin } from "@/lib/auth/get-user";
import { listAdminUsers } from "@/lib/server/users";
import { ROLE_LABELS } from "@/lib/constants/roles";

function initials(name: string | null, email: string | null) {
  const source = (name && name.trim()) || email || "?";
  const parts = source.split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function fmtDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function AdminUsersPage() {
  const { profile } = await requireAdmin();
  const users = await listAdminUsers();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Invite team members, set their role, and decide which locations
            they can see.
          </CardDescription>
        </div>
        <Button asChild className="gap-1.5">
          <Link href="/admin/users/new">
            <UserPlus className="h-4 w-4" />
            Invite user
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No users yet"
            description="Invite your first teammate to get started."
          />
        ) : (
          <div className="divide-y rounded-md border">
            {users.map((u) => {
              const lastSeen = fmtDate(u.last_sign_in_at);
              const invited = fmtDate(u.invited_at);
              return (
                <div
                  key={u.id}
                  className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar className="h-9 w-9">
                      {u.avatar_url ? (
                        <AvatarImage
                          src={u.avatar_url}
                          alt={u.full_name ?? ""}
                        />
                      ) : null}
                      <AvatarFallback>
                        {initials(u.full_name, u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/${u.id}/edit`}
                        className="block truncate text-sm font-medium hover:text-accent"
                      >
                        {u.full_name ?? u.email ?? u.id}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email}
                        {u.job_title ? ` · ${u.job_title}` : ""}
                      </p>
                      {u.locations.length > 0 ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {u.locations.map((l) => l.name).join(" · ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={u.is_active ? "secondary" : "outline"}>
                      {ROLE_LABELS[u.role]}
                    </Badge>
                    {!u.is_active ? (
                      <Badge variant="destructive">Inactive</Badge>
                    ) : null}
                    {!u.has_logged_in && invited ? (
                      <Badge variant="outline" className="text-amber-600">
                        Invited {invited}
                      </Badge>
                    ) : null}
                    {lastSeen ? (
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        Last seen {lastSeen}
                      </span>
                    ) : null}
                    <UserRowActions
                      userId={u.id}
                      isActive={u.is_active}
                      hasLoggedIn={u.has_logged_in}
                      isSelf={u.id === profile.id}
                      displayName={u.full_name ?? u.email ?? u.id}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

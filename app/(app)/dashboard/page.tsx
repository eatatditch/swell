import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { TaskFormDialog } from "@/components/tasks/task-form-dialog";
import { TaskList } from "@/components/tasks/task-list";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { requireUser } from "@/lib/auth/get-user";
import { getMyOpenTasks } from "@/lib/server/queries";

export default async function DashboardPage() {
  const { profile, locations } = await requireUser();
  const { tasks } = await getMyOpenTasks(profile.id);

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.full_name ?? "team"}`}
        description="Your home base. Today's priorities, open issues, and what changed."
        action={<TaskFormDialog />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role</CardTitle>
            <CardDescription>{ROLE_LABELS[profile.role]}</CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Locations</CardTitle>
            <CardDescription>
              {locations.length === 0
                ? "No locations assigned yet."
                : locations.map((l) => l.name).join(" · ")}
            </CardDescription>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open Tasks</CardTitle>
            <CardDescription>Assigned to you.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums">{tasks.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your Tasks</CardTitle>
            <CardDescription>
              Open work assigned to you, sorted by due date.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks}
              emptyTitle="You're clear"
              emptyDescription="Nothing assigned to you right now."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
            <CardDescription>What changed across SWELL.</CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityFeed limit={15} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, BookOpen, Download, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getCourseReports,
  getTeamProgress,
} from "@/lib/server/training";
import { TRAINING_STAFF_TYPE_LABELS } from "@/lib/constants/training";
import { cn } from "@/lib/utils";

export default async function TrainingReportsPage() {
  const { profile } = await requireUser();
  if (!canWriteContent(profile.role)) redirect("/training");

  const [team, courses] = await Promise.all([
    getTeamProgress(),
    getCourseReports(),
  ]);

  const totalAssigned = courses.reduce((n, r) => n + r.assignedStaff, 0);
  const totalDone = courses.reduce((n, r) => n + r.completedStaff, 0);
  const totalPendingSignoff = courses.reduce(
    (n, r) => n + r.pendingSignoffs,
    0,
  );

  return (
    <>
      <PageHeader
        title="Training reports"
        description="Roll-ups by team member and by course. Export to CSV."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/api/training/reports/export?scope=team"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Team CSV
            </Link>
            <Link
              href="/api/training/reports/export?scope=course"
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              <Download className="h-4 w-4" /> Course CSV
            </Link>
            <Link
              href="/training/progress"
              className="inline-flex h-9 items-center gap-1 rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-soft"
            >
              <ArrowLeft className="h-4 w-4" /> Progress
            </Link>
          </div>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Team size" value={String(team.length)} />
        <Stat
          icon={BookOpen}
          label="Total assignments"
          value={String(totalAssigned)}
        />
        <Stat
          icon={BookOpen}
          label="Course completions"
          value={String(totalDone)}
        />
        <Stat
          icon={Users}
          label="Pending sign-offs"
          value={String(totalPendingSignoff)}
          tone={totalPendingSignoff > 0 ? "warn" : "default"}
        />
      </section>

      <Tabs defaultValue="team" className="space-y-4">
        <TabsList>
          <TabsTrigger value="team">By team member</TabsTrigger>
          <TabsTrigger value="course">By course</TabsTrigger>
        </TabsList>

        <TabsContent value="team">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Team roll-up</CardTitle>
              <CardDescription>
                Assigned lessons (via paths), completed, quizzes passed,
                expiring certs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {team.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No staff yet"
                  description="Add training staff at /training/staff."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Person</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Lessons
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Quizzes passed
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Attempts
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Certs expiring
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {team.map((r) => {
                        const pct =
                          r.totalLessons === 0
                            ? 0
                            : Math.round(
                                (r.completedLessons / r.totalLessons) * 100,
                              );
                        return (
                          <tr
                            key={r.staff.id}
                            className="border-t border-border align-middle"
                          >
                            <td className="px-3 py-2">
                              <p className="font-medium">
                                {r.staff.full_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {TRAINING_STAFF_TYPE_LABELS[r.staff.staff_type]}
                              </p>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.completedLessons}/{r.totalLessons}
                              <span className="ml-1 text-xs text-muted-foreground">
                                ({pct}%)
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.quizPassedCount}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                              {r.quizAttempts}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums",
                                r.certificationsExpiringSoon > 0 &&
                                  "font-semibold text-rose-600",
                              )}
                            >
                              {r.certificationsExpiringSoon}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="course">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Course roll-up</CardTitle>
              <CardDescription>
                Assigned via path, completed all lessons, awaiting sign-off.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {courses.length === 0 ? (
                <EmptyState
                  icon={BookOpen}
                  title="No courses yet"
                  description="Create courses in the library."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Course</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Assigned
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Completed
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Completion %
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Pending sign-off
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {courses.map((r) => {
                        const pct =
                          r.assignedStaff === 0
                            ? 0
                            : Math.round(
                                (r.completedStaff / r.assignedStaff) * 100,
                              );
                        return (
                          <tr
                            key={r.course.id}
                            className="border-t border-border align-middle"
                          >
                            <td className="px-3 py-2">
                              <Link
                                href={`/training/courses/${r.course.slug}`}
                                className="font-medium text-accent hover:underline"
                              >
                                {r.course.title}
                              </Link>
                              {r.course.is_required ? (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  · required
                                </span>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.assignedStaff}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.completedStaff}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {pct}%
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums",
                                r.pendingSignoffs > 0 &&
                                  "font-semibold text-amber-600",
                              )}
                            >
                              {r.pendingSignoffs}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p
          className={
            tone === "warn"
              ? "text-3xl font-semibold tabular-nums text-rose-600"
              : "text-3xl font-semibold tabular-nums"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

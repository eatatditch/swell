import Link from "next/link";
import {
  Award,
  BookOpen,
  CheckCircle2,
  Compass,
  GraduationCap,
  ListChecks,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { CertificationList } from "@/components/training/certifications/certification-list";
import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getUserTrainingOverview,
} from "@/lib/server/training";
import { formatDuration } from "@/lib/constants/training";
import { ROLE_LABELS } from "@/lib/constants/roles";

export default async function TrainingHomePage() {
  const { profile } = await requireUser();
  const isManager = canWriteContent(profile.role);
  const overview = await getUserTrainingOverview(profile.id);

  let totalCourses = 0;
  let completedCourses = 0;
  let overdueCount = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const up of overview.paths) {
    for (const pc of up.path.path_courses ?? []) {
      totalCourses += 1;
      if (overview.signoffsByCourseId.has(pc.course_id)) {
        completedCourses += 1;
      }
    }
    if (up.due_date && new Date(up.due_date) < today && !up.completed_at) {
      overdueCount += 1;
    }
  }

  const certsExpiringSoon = overview.certifications.filter((c) => {
    if (!c.expires_on) return false;
    const exp = new Date(c.expires_on);
    exp.setHours(0, 0, 0, 0);
    const diff = Math.round((exp.getTime() - today.getTime()) / 86_400_000);
    return diff <= 30;
  }).length;

  return (
    <>
      <PageHeader
        title="Surf School"
        description={`Welcome, ${profile.full_name ?? "team"} · ${ROLE_LABELS[profile.role]}.`}
        action={
          <div className="flex gap-2">
            <Link
              href="/training/courses"
              className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Course library
            </Link>
            {isManager ? (
              <Link
                href="/training/progress"
                className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-soft"
              >
                Team progress
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={ListChecks}
          label="Assigned paths"
          value={String(overview.paths.length)}
        />
        <Stat
          icon={CheckCircle2}
          label="Courses signed off"
          value={`${completedCourses}/${totalCourses}`}
        />
        <Stat
          icon={BookOpen}
          label="Overdue"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? "warn" : "default"}
        />
        <Stat
          icon={Award}
          label="Certs expiring (30d)"
          value={String(certsExpiringSoon)}
          tone={certsExpiringSoon > 0 ? "warn" : "default"}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your training paths</CardTitle>
            <CardDescription>
              Each path is a sequence of courses your manager assigned you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview.paths.length === 0 ? (
              <EmptyState
                icon={Compass}
                title="No paths assigned yet"
                description={
                  isManager
                    ? "Browse the course library or assign yourself a path from Team progress."
                    : "A manager will assign your path. In the meantime, check the course library."
                }
              />
            ) : (
              <ul className="space-y-3">
                {overview.paths.map((up) => {
                  const courses = up.path.path_courses ?? [];
                  const done = courses.filter((pc) =>
                    overview.signoffsByCourseId.has(pc.course_id),
                  ).length;
                  const pct =
                    courses.length === 0
                      ? 0
                      : Math.round((done / courses.length) * 100);
                  return (
                    <li
                      key={up.id}
                      className="rounded-lg border bg-card p-4"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-medium">{up.path.name}</p>
                        <span className="text-xs text-muted-foreground">
                          {done}/{courses.length} courses
                          {up.due_date ? ` · due ${up.due_date}` : ""}
                        </span>
                      </div>
                      {up.path.description ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          {up.path.description}
                        </p>
                      ) : null}
                      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <ul className="mt-3 space-y-1.5">
                        {courses.map((pc) => {
                          const signed = overview.signoffsByCourseId.has(
                            pc.course_id,
                          );
                          return (
                            <li key={pc.id}>
                              <Link
                                href={`/training/courses/${pc.course.slug}`}
                                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                              >
                                <span className="flex items-center gap-2">
                                  {signed ? (
                                    <CheckCircle2 className="h-4 w-4 text-primary" />
                                  ) : (
                                    <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  {pc.course.title}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatDuration(pc.course.estimated_minutes)}
                                </span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Certifications</CardTitle>
            <CardDescription>Your active credentials.</CardDescription>
          </CardHeader>
          <CardContent>
            <CertificationList
              certifications={overview.certifications}
              canManage={false}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Compass;
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

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, GraduationCap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { LessonEditor } from "@/components/training/admin/lesson-editor";
import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getCourseWithLessons,
} from "@/lib/server/training";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/constants/training";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types/database";

export default async function CourseDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { profile } = await requireUser();
  const isManager = canWriteContent(profile.role);

  const course = await getCourseWithLessons(params.slug);
  if (!course) notFound();

  const supabase = createSupabaseServerClient();
  const lessonIds = course.lessons.map((l) => l.id);
  const [progressRes, signoffRes] = await Promise.all([
    lessonIds.length > 0
      ? supabase
          .from("training_progress")
          .select("lesson_id")
          .eq("user_id", profile.id)
          .in("lesson_id", lessonIds)
      : Promise.resolve({ data: [] as { lesson_id: string }[] }),
    supabase
      .from("training_signoffs")
      .select("*, signer:profiles!training_signoffs_signed_by_fkey(full_name, email)")
      .eq("user_id", profile.id)
      .eq("course_id", course.id)
      .maybeSingle(),
  ]);

  const completed = new Set(
    (progressRes.data ?? []).map((p) => p.lesson_id as string),
  );
  const completedCount = completed.size;
  const totalCount = course.lessons.length;
  const allLessonsDone = totalCount > 0 && completedCount === totalCount;
  const signoff = signoffRes.data as
    | {
        id: string;
        signed_at: string;
        notes: string | null;
        signer: { full_name: string | null; email: string | null } | null;
      }
    | null;

  return (
    <>
      <PageHeader
        title={course.title}
        description={
          <div>
            {course.category ? (
              <p className="text-accent">{course.category.name}</p>
            ) : null}
            {course.description ? (
              <p>{course.description}</p>
            ) : null}
          </div>
        }
        action={
          <Link
            href="/training/courses"
            className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Library
          </Link>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums">
              {completedCount}/{totalCount}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent transition-all"
                style={{
                  width: `${
                    totalCount === 0
                      ? 0
                      : Math.round((completedCount / totalCount) * 100)
                  }%`,
                }}
              />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold tabular-nums">
              {formatDuration(course.estimated_minutes)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Required
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-3xl font-semibold">
              {course.is_required ? "Yes" : "No"}
            </p>
            {course.requires_signoff ? (
              <p className="text-xs text-muted-foreground">
                Manager sign-off required
              </p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Sign-off
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {signoff ? (
              <>
                <p className="text-sm font-medium text-primary">Signed</p>
                <p className="text-xs text-muted-foreground">
                  {signoff.signed_at.slice(0, 10)}
                  {signoff.signer?.full_name
                    ? ` · ${signoff.signer.full_name}`
                    : ""}
                </p>
              </>
            ) : course.requires_signoff ? (
              <p className="text-sm text-muted-foreground">
                {allLessonsDone
                  ? "Ready for a manager"
                  : "Finish the lessons first"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Not required</p>
            )}
          </CardContent>
        </Card>
      </div>

      {course.target_roles.length > 0 ? (
        <p className="mb-4 text-xs text-muted-foreground">
          For:{" "}
          {course.target_roles
            .map((r) => ROLE_LABELS[r as Role] ?? r)
            .join(", ")}
        </p>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base">Lessons</CardTitle>
            <CardDescription>
              Work through them in order. Each one stamps your progress.
            </CardDescription>
          </div>
          {isManager ? <LessonEditor courseId={course.id} /> : null}
        </CardHeader>
        <CardContent>
          {course.lessons.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No lessons yet"
              description={
                isManager
                  ? "Add the first lesson above."
                  : "This course is being prepared."
              }
            />
          ) : (
            <ol className="space-y-2">
              {course.lessons.map((l, i) => {
                const done = completed.has(l.id);
                const previous = i === 0 ? true : completed.has(course.lessons[i - 1].id);
                const locked = !done && !previous && !isManager;
                return (
                  <li key={l.id}>
                    <Link
                      href={locked ? "#" : `/training/lessons/${l.id}`}
                      aria-disabled={locked || undefined}
                      onClick={
                        locked
                          ? (e) => e.preventDefault()
                          : undefined
                      }
                      className={cn(
                        "flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
                        !locked && "hover:bg-muted/40",
                        locked && "opacity-60",
                      )}
                    >
                      <span className="text-xs font-mono text-muted-foreground">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{l.title}</p>
                        {l.estimated_minutes ? (
                          <p className="text-xs text-muted-foreground">
                            {formatDuration(l.estimated_minutes)}
                          </p>
                        ) : null}
                      </div>
                      {locked ? (
                        <span className="text-xs text-muted-foreground">
                          Locked
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </>
  );
}

import Link from "next/link";
import { CheckCircle2, ClipboardCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { requireUser } from "@/lib/auth/get-user";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canWriteContent } from "@/lib/server/training";
import { cn } from "@/lib/utils";

interface QuizRow {
  id: string;
  title: string;
  passing_score: number;
  retry_limit: number;
  lesson: {
    id: string;
    title: string;
    course: { slug: string; title: string; is_active: boolean } | null;
  } | null;
}

export default async function QuizzesIndexPage() {
  const { profile } = await requireUser();
  const isManager = canWriteContent(profile.role);
  const supabase = createSupabaseServerClient();

  const [quizzesRes, attemptsRes] = await Promise.all([
    supabase
      .from("training_quizzes")
      .select(
        "id, title, passing_score, retry_limit, lesson:training_lessons(id, title, course:training_courses(slug, title, is_active))",
      )
      .eq("is_active", true)
      .not("lesson_id", "is", null),
    supabase
      .from("training_quiz_attempts")
      .select("quiz_id, score, passed, completed_at")
      .order("completed_at", { ascending: false }),
  ]);

  const quizzes = ((quizzesRes.data ?? []) as unknown as QuizRow[]).filter(
    (q) => q.lesson?.course?.is_active,
  );

  const attemptsByQuiz = new Map<
    string,
    { attempts: number; best: number; passed: boolean; lastAt: string | null }
  >();
  for (const a of (attemptsRes.data ?? []) as {
    quiz_id: string;
    score: number;
    passed: boolean;
    completed_at: string;
  }[]) {
    const cur = attemptsByQuiz.get(a.quiz_id) ?? {
      attempts: 0,
      best: 0,
      passed: false,
      lastAt: null,
    };
    cur.attempts += 1;
    if (a.score > cur.best) cur.best = a.score;
    if (a.passed) cur.passed = true;
    if (!cur.lastAt || a.completed_at > cur.lastAt) cur.lastAt = a.completed_at;
    attemptsByQuiz.set(a.quiz_id, cur);
  }

  const grouped = new Map<string, QuizRow[]>();
  for (const q of quizzes) {
    const courseTitle = q.lesson?.course?.title ?? "Other";
    const list = grouped.get(courseTitle) ?? [];
    list.push(q);
    grouped.set(courseTitle, list);
  }

  return (
    <>
      <PageHeader
        title="Quizzes"
        description="Every knowledge check in the catalog, with team-wide attempt stats."
        action={
          <Link
            href="/training"
            className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            Back to Surf School
          </Link>
        }
      />

      {quizzes.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="No quizzes yet"
          description={
            isManager
              ? "Add quizzes from inside individual lessons in the course library."
              : "Your manager hasn't added quizzes yet."
          }
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([course, list]) => (
            <section key={course}>
              <h2 className="mb-3 font-display text-lg font-bold">{course}</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((q) => {
                  const summary = attemptsByQuiz.get(q.id);
                  const href = q.lesson
                    ? `/training/lessons/${q.lesson.id}`
                    : "#";
                  return (
                    <li key={q.id}>
                      <Link
                        href={href}
                        className={cn(
                          "block rounded-2xl border bg-card p-4 transition-colors hover:bg-muted/40",
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={cn(
                              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                              summary?.passed
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-accent",
                            )}
                          >
                            {summary?.passed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <ClipboardCheck className="h-4 w-4" />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-medium">{q.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {q.lesson?.title ?? "—"}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {summary
                                ? `${summary.attempts} attempt${summary.attempts === 1 ? "" : "s"} · best ${summary.best}%`
                                : `Pass at ${q.passing_score}%${q.retry_limit > 0 ? ` · ${q.retry_limit} attempts` : ""}`}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">How quizzes work</CardTitle>
          <CardDescription>
            Staff take quizzes on the training kiosk. This view shows
            team-wide attempt stats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· Server-graded — answers can&apos;t be tampered with from the browser.</li>
            <li>· Best score across all attempts counts.</li>
            <li>· Some quizzes cap attempts (safety + alcohol do).</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

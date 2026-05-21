import Link from "next/link";
import { CheckCircle2, ClipboardCheck, Lock } from "lucide-react";

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

  const [quizzesRes, attemptsRes, progressRes] = await Promise.all([
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
      .eq("user_id", profile.id)
      .order("completed_at", { ascending: false }),
    supabase
      .from("training_progress")
      .select("lesson_id")
      .eq("user_id", profile.id),
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

  const completedLessons = new Set(
    ((progressRes.data ?? []) as { lesson_id: string }[]).map(
      (p) => p.lesson_id,
    ),
  );

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
        description="Every knowledge check in one place. Pass them to lock in what you learned."
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
                  const lessonDone = q.lesson
                    ? completedLessons.has(q.lesson.id)
                    : false;
                  // Quiz is takeable if the parent lesson is finished — same
                  // gating logic that protects the inline knowledge check.
                  const locked = !lessonDone && !isManager;
                  const href = q.lesson
                    ? `/training/lessons/${q.lesson.id}`
                    : "#";
                  return (
                    <li key={q.id}>
                      <Link
                        href={locked ? "#" : href}
                        aria-disabled={locked || undefined}
                        onClick={
                          locked ? (e) => e.preventDefault() : undefined
                        }
                        className={cn(
                          "block rounded-2xl border bg-card p-4 transition-colors",
                          !locked && "hover:bg-muted/40",
                          locked && "opacity-60",
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
                            {locked ? (
                              <Lock className="h-4 w-4" />
                            ) : summary?.passed ? (
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
                              {locked
                                ? "Finish the lesson first"
                                : summary?.passed
                                  ? `Passed · best ${summary.best}%`
                                  : summary
                                    ? `Best ${summary.best}% · ${summary.attempts} attempt${summary.attempts === 1 ? "" : "s"}`
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
            Open a quiz from the lesson it belongs to. Your best score counts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>· You can retry unless the quiz caps attempts (safety + alcohol do).</li>
            <li>· Server-graded — answers can&apos;t be tampered with from the browser.</li>
            <li>· Passing a quiz doesn&apos;t auto-mark the lesson complete; mark the lesson done when you&apos;re ready.</li>
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

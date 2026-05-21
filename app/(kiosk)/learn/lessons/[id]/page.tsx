import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Clock,
  GraduationCap,
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
import { LessonContent } from "@/components/training/lesson-content";
import { ResourceList } from "@/components/training/resource-list";
import { MarkCompleteButton } from "@/components/training/mark-complete-button";
import { QuizRunner } from "@/components/training/quiz-runner";
import { requireKioskStaff } from "@/lib/server/training-staff";
import { courseVisibleTo } from "@/lib/server/training";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { formatDuration } from "@/lib/constants/training";
import type {
  TrainingLesson,
  TrainingLessonResource,
  TrainingQuiz,
  TrainingQuizAttempt,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from "@/lib/types/database";

export const dynamic = "force-dynamic";

export default async function KioskLessonPage({
  params,
}: {
  params: { id: string };
}) {
  const staff = await requireKioskStaff();
  const admin = createSupabaseAdminClient();

  const { data: lesson } = await admin
    .from("training_lessons")
    .select(
      "*, course:training_courses(id, slug, title, requires_signoff, applies_to_staff_types, lessons:training_lessons(id, slug, title, position, is_active))",
    )
    .eq("id", params.id)
    .eq("is_active", true)
    .maybeSingle();

  if (!lesson) notFound();

  const course = (lesson as TrainingLesson & {
    course: {
      id: string;
      slug: string;
      title: string;
      requires_signoff: boolean;
      applies_to_staff_types: string[];
      lessons: {
        id: string;
        slug: string;
        title: string;
        position: number;
        is_active: boolean;
      }[];
    };
  }).course;

  if (!courseVisibleTo(course as never, staff.staff_type)) {
    redirect("/learn/courses");
  }

  const sequence = course.lessons
    .filter((l) => l.is_active)
    .sort((a, b) => a.position - b.position);
  const currentIdx = sequence.findIndex((l) => l.id === lesson.id);
  const prev = currentIdx > 0 ? sequence[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < sequence.length - 1
      ? sequence[currentIdx + 1]
      : null;

  const [progressRes, resourcesRes, quizRes, attemptsRes] = await Promise.all([
    admin
      .from("training_progress")
      .select("lesson_id")
      .eq("staff_id", staff.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
    admin
      .from("training_lesson_resources")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("position"),
    admin
      .from("training_quizzes")
      .select(
        "*, questions:training_quiz_questions(*, options:training_quiz_options(*))",
      )
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
    admin
      .from("training_quiz_attempts")
      .select("*")
      .eq("staff_id", staff.id)
      .order("completed_at", { ascending: false }),
  ]);

  const completed = !!progressRes.data;
  const resources = (resourcesRes.data ?? []) as TrainingLessonResource[];
  const quiz = quizRes.data as
    | (TrainingQuiz & {
        questions: (TrainingQuizQuestion & {
          options: TrainingQuizOption[];
        })[];
      })
    | null;

  if (quiz) {
    quiz.questions = (quiz.questions ?? [])
      .sort((a, b) => a.position - b.position)
      .map((q) => ({
        ...q,
        options: (q.options ?? []).sort((a, b) => a.position - b.position),
      }));
  }

  const attempts = (attemptsRes.data ?? []) as TrainingQuizAttempt[];
  const quizAttempts = quiz
    ? attempts.filter((a) => a.quiz_id === quiz.id)
    : [];

  return (
    <>
      <PageHeader
        title={lesson.title}
        description={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={`/learn/courses/${course.slug}`}
              className="text-accent hover:underline"
            >
              {course.title}
            </Link>
            {lesson.estimated_minutes ? (
              <span className="text-muted-foreground">
                · <Clock className="inline h-3 w-3" />{" "}
                {formatDuration(lesson.estimated_minutes)}
              </span>
            ) : null}
            <span className="text-muted-foreground">
              · Lesson {currentIdx + 1} of {sequence.length}
            </span>
          </div>
        }
        action={
          <Link
            href={`/learn/courses/${course.slug}`}
            className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" /> Course
          </Link>
        }
      />

      {lesson.video_url ? (
        <Card className="mb-6">
          <CardContent className="p-0">
            <VideoEmbed url={lesson.video_url} title={lesson.title} />
          </CardContent>
        </Card>
      ) : null}

      {lesson.content ? (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <LessonContent content={lesson.content} />
          </CardContent>
        </Card>
      ) : null}

      {resources.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Resources</CardTitle>
            <CardDescription>Open in a new tab.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResourceList resources={resources} />
          </CardContent>
        </Card>
      ) : null}

      {quiz ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              Knowledge check
            </CardTitle>
            <CardDescription>{quiz.title}</CardDescription>
          </CardHeader>
          <CardContent>
            {quiz.questions.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No questions yet"
                description="This quiz is being prepared."
              />
            ) : (
              <QuizRunner
                quiz={{
                  id: quiz.id,
                  title: quiz.title,
                  description: quiz.description,
                  passingScore: quiz.passing_score,
                  retryLimit: quiz.retry_limit,
                }}
                questions={quiz.questions}
                attemptsTaken={quizAttempts.length}
                bestScore={
                  quizAttempts.length === 0
                    ? null
                    : Math.max(...quizAttempts.map((a) => a.score))
                }
              />
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <MarkCompleteButton
          lessonId={lesson.id}
          alreadyCompleted={completed}
          nextHref={
            next ? `/learn/lessons/${next.id}` : `/learn/courses/${course.slug}`
          }
        />
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              href={`/learn/lessons/${prev.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> {prev.title}
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/learn/lessons/${next.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </>
  );
}

function VideoEmbed({ url, title }: { url: string; title: string }) {
  const youtube = parseYouTubeId(url);
  if (youtube) {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://www.youtube.com/embed/${youtube}`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full rounded-2xl"
        />
      </div>
    );
  }
  const vimeo = parseVimeoId(url);
  if (vimeo) {
    return (
      <div className="aspect-video w-full">
        <iframe
          src={`https://player.vimeo.com/video/${vimeo}`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="h-full w-full rounded-2xl"
        />
      </div>
    );
  }
  return (
    <video controls preload="metadata" className="w-full rounded-2xl bg-black">
      <source src={url} />
    </video>
  );
}

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return v;
      const m = u.pathname.match(/^\/(?:embed|shorts)\/([\w-]+)/);
      if (m) return m[1];
    }
    if (u.hostname === "youtu.be") {
      return u.pathname.slice(1) || null;
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/\/(\d+)/);
      if (m) return m[1];
    }
  } catch {
    return null;
  }
  return null;
}

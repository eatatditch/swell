import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
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
import { LessonSettingsDialog } from "@/components/training/admin/lesson-settings-dialog";
import { QuestionEditor } from "@/components/training/admin/question-editor";
import { QuizCreateButton } from "@/components/training/admin/quiz-create-button";
import { ResourceEditor } from "@/components/training/admin/resource-editor";
import { requireUser } from "@/lib/auth/get-user";
import { canWriteContent } from "@/lib/server/training";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDuration } from "@/lib/constants/training";
import type {
  TrainingLesson,
  TrainingLessonResource,
  TrainingQuiz,
  TrainingQuizAttempt,
  TrainingQuizOption,
  TrainingQuizQuestion,
} from "@/lib/types/database";

export default async function LessonPage({
  params,
}: {
  params: { id: string };
}) {
  const { profile } = await requireUser();
  const isManager = canWriteContent(profile.role);
  const supabase = createSupabaseServerClient();

  const { data: lesson } = await supabase
    .from("training_lessons")
    .select(
      "*, course:training_courses(id, slug, title, requires_signoff, lessons:training_lessons(id, slug, title, position, is_active))",
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
      lessons: {
        id: string;
        slug: string;
        title: string;
        position: number;
        is_active: boolean;
      }[];
    };
  }).course;

  const sequence = course.lessons
    .filter((l) => l.is_active)
    .sort((a, b) => a.position - b.position);
  const currentIdx = sequence.findIndex((l) => l.id === lesson.id);
  const prev = currentIdx > 0 ? sequence[currentIdx - 1] : null;
  const next =
    currentIdx >= 0 && currentIdx < sequence.length - 1
      ? sequence[currentIdx + 1]
      : null;

  // Gating: a non-manager must have completed the previous lesson.
  if (!isManager && prev) {
    const { data: prevDone } = await supabase
      .from("training_progress")
      .select("id")
      .eq("user_id", profile.id)
      .eq("lesson_id", prev.id)
      .maybeSingle();
    if (!prevDone) {
      return (
        <>
          <PageHeader title="Locked" />
          <EmptyState
            icon={GraduationCap}
            title="Finish the previous lesson first"
            description={`Complete "${prev.title}" to unlock this one.`}
            action={
              <Link
                href={`/training/courses/${course.slug}`}
                className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-soft"
              >
                Back to course
              </Link>
            }
          />
        </>
      );
    }
  }

  const [progressRes, resourcesRes, quizRes] = await Promise.all([
    supabase
      .from("training_progress")
      .select("id")
      .eq("user_id", profile.id)
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
    supabase
      .from("training_lesson_resources")
      .select("*")
      .eq("lesson_id", lesson.id)
      .order("position"),
    supabase
      .from("training_quizzes")
      .select(
        "*, questions:training_quiz_questions(*, options:training_quiz_options(*))",
      )
      .eq("lesson_id", lesson.id)
      .maybeSingle(),
  ]);

  const alreadyCompleted = !!progressRes.data;
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

  let attemptsTaken = 0;
  let bestScore: number | null = null;
  if (quiz) {
    const { data: attempts } = await supabase
      .from("training_quiz_attempts")
      .select("score, passed")
      .eq("user_id", profile.id)
      .eq("quiz_id", quiz.id);
    const rows = (attempts ?? []) as Pick<
      TrainingQuizAttempt,
      "score" | "passed"
    >[];
    attemptsTaken = rows.length;
    bestScore = rows.length
      ? rows.reduce((m, a) => Math.max(m, a.score), 0)
      : null;
  }

  return (
    <>
      <PageHeader
        title={lesson.title}
        description={
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Link
              href={`/training/courses/${course.slug}`}
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
          <div className="flex gap-2">
            {isManager ? <LessonSettingsDialog lesson={lesson} /> : null}
            <Link
              href={`/training/courses/${course.slug}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Course
            </Link>
          </div>
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

      {resources.length > 0 || isManager ? (
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Resources</CardTitle>
              <CardDescription>
                {isManager
                  ? "Videos, PDFs, links. Open in a new tab."
                  : "Open in a new tab."}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isManager ? (
              <ResourceEditor lessonId={lesson.id} resources={resources} />
            ) : (
              <ResourceList resources={resources} />
            )}
          </CardContent>
        </Card>
      ) : null}

      <Card className="mb-6">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="h-4 w-4 text-accent" />
              Knowledge check
            </CardTitle>
            <CardDescription>
              {quiz
                ? isManager
                  ? "Add or edit questions below."
                  : "Take the quiz to confirm you got it."
                : isManager
                  ? "No quiz yet — add one to make this lesson testable."
                  : "No quiz on this lesson — just mark complete when you're done."}
            </CardDescription>
          </div>
          {isManager && !quiz ? (
            <QuizCreateButton lessonId={lesson.id} />
          ) : null}
        </CardHeader>
        <CardContent>
          {quiz ? (
            isManager ? (
              <QuestionEditor quizId={quiz.id} questions={quiz.questions} />
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
                attemptsTaken={attemptsTaken}
                bestScore={bestScore}
              />
            )
          ) : null}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <MarkCompleteButton
          lessonId={lesson.id}
          alreadyCompleted={alreadyCompleted}
          nextHref={next ? `/training/lessons/${next.id}` : null}
        />
        <div className="flex items-center gap-2">
          {prev ? (
            <Link
              href={`/training/lessons/${prev.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> {prev.title}
            </Link>
          ) : null}
          {next ? (
            <Link
              href={`/training/lessons/${next.id}`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
            >
              {next.title} <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <Link
              href={`/training/courses/${course.slug}`}
              className="inline-flex h-9 items-center gap-1 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
            >
              <CheckCircle2 className="h-4 w-4" /> Finish course
            </Link>
          )}
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

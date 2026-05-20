import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Certification,
  ProfileLite,
  Role,
  TrainingCategory,
  TrainingCourse,
  TrainingLesson,
  TrainingLessonResource,
  TrainingPath,
  TrainingPathCourse,
  TrainingProgress,
  TrainingQuiz,
  TrainingQuizAttempt,
  TrainingQuizOption,
  TrainingQuizQuestion,
  TrainingSignoff,
  UserTrainingPath,
} from "@/lib/types/database";

export function canWriteContent(role: Role): boolean {
  return (
    role === "founder_admin" ||
    role === "general_manager" ||
    role === "service_manager" ||
    role === "kitchen_manager"
  );
}

export interface CourseWithLessons extends TrainingCourse {
  lessons: TrainingLesson[];
  category: TrainingCategory | null;
}

export async function getCategories(): Promise<TrainingCategory[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_categories")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  return (data ?? []) as TrainingCategory[];
}

export interface CourseListItem extends TrainingCourse {
  category: TrainingCategory | null;
  lesson_count: number;
}

export async function getCourseList(): Promise<CourseListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_courses")
    .select("*, category:training_categories(*), lessons:training_lessons(id)")
    .order("sort_order")
    .order("title");
  return ((data ?? []) as (TrainingCourse & {
    category: TrainingCategory | null;
    lessons: { id: string }[];
  })[]).map((c) => ({
    ...c,
    lesson_count: c.lessons?.length ?? 0,
  }));
}

export async function getCourseWithLessons(
  slug: string,
): Promise<CourseWithLessons | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_courses")
    .select(
      "*, category:training_categories(*), lessons:training_lessons(*)",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!data) return null;
  const row = data as TrainingCourse & {
    category: TrainingCategory | null;
    lessons: TrainingLesson[];
  };
  return {
    ...row,
    lessons: (row.lessons ?? [])
      .filter((l) => l.is_active)
      .sort((a, b) => a.position - b.position),
  };
}

export interface LessonWithContext {
  lesson: TrainingLesson;
  course: TrainingCourse;
  category: TrainingCategory | null;
  resources: TrainingLessonResource[];
  quiz:
    | (TrainingQuiz & {
        questions: (TrainingQuizQuestion & {
          options: TrainingQuizOption[];
        })[];
      })
    | null;
  sequence: { id: string; slug: string; title: string; position: number }[];
}

export async function getLessonWithContext(
  courseSlug: string,
  lessonSlug: string,
): Promise<LessonWithContext | null> {
  const supabase = createSupabaseServerClient();
  const { data: course } = await supabase
    .from("training_courses")
    .select("*, category:training_categories(*)")
    .eq("slug", courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: lesson } = await supabase
    .from("training_lessons")
    .select("*")
    .eq("course_id", course.id)
    .eq("slug", lessonSlug)
    .maybeSingle();
  if (!lesson) return null;

  const [resourcesRes, quizRes, sequenceRes] = await Promise.all([
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
    supabase
      .from("training_lessons")
      .select("id, slug, title, position")
      .eq("course_id", course.id)
      .eq("is_active", true)
      .order("position"),
  ]);

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

  return {
    lesson: lesson as TrainingLesson,
    course: course as TrainingCourse,
    category: (course as TrainingCourse & { category: TrainingCategory | null })
      .category,
    resources: (resourcesRes.data ?? []) as TrainingLessonResource[],
    quiz,
    sequence: (sequenceRes.data ?? []) as {
      id: string;
      slug: string;
      title: string;
      position: number;
    }[],
  };
}

export interface UserTrainingOverview {
  paths: (UserTrainingPath & {
    path: TrainingPath & {
      path_courses: (TrainingPathCourse & { course: TrainingCourse })[];
    };
  })[];
  completedLessonIds: Set<string>;
  attemptsByQuizId: Map<string, TrainingQuizAttempt[]>;
  signoffsByCourseId: Map<string, TrainingSignoff>;
  certifications: Certification[];
}

export async function getUserTrainingOverview(
  userId: string,
): Promise<UserTrainingOverview> {
  const supabase = createSupabaseServerClient();
  const [pathsRes, progressRes, attemptsRes, signoffsRes, certsRes] =
    await Promise.all([
      supabase
        .from("user_training_paths")
        .select(
          "*, path:training_paths(*, path_courses:training_path_courses(*, course:training_courses(*)))",
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
      supabase
        .from("training_progress")
        .select("lesson_id, completed_at")
        .eq("user_id", userId),
      supabase
        .from("training_quiz_attempts")
        .select("*")
        .eq("user_id", userId)
        .order("completed_at", { ascending: false }),
      supabase
        .from("training_signoffs")
        .select("*")
        .eq("user_id", userId),
      supabase
        .from("certifications")
        .select("*")
        .eq("user_id", userId)
        .order("expires_on", { ascending: true, nullsFirst: false }),
    ]);

  const completedLessonIds = new Set(
    (progressRes.data ?? []).map(
      (p: { lesson_id: string }) => p.lesson_id,
    ),
  );

  const attemptsByQuizId = new Map<string, TrainingQuizAttempt[]>();
  for (const a of (attemptsRes.data ?? []) as TrainingQuizAttempt[]) {
    const list = attemptsByQuizId.get(a.quiz_id) ?? [];
    list.push(a);
    attemptsByQuizId.set(a.quiz_id, list);
  }

  const signoffsByCourseId = new Map<string, TrainingSignoff>();
  for (const s of (signoffsRes.data ?? []) as TrainingSignoff[]) {
    signoffsByCourseId.set(s.course_id, s);
  }

  const paths = (pathsRes.data ?? []) as (UserTrainingPath & {
    path: TrainingPath & {
      path_courses: (TrainingPathCourse & { course: TrainingCourse })[];
    };
  })[];

  for (const up of paths) {
    if (up.path?.path_courses) {
      up.path.path_courses.sort((a, b) => a.position - b.position);
    }
  }

  return {
    paths,
    completedLessonIds,
    attemptsByQuizId,
    signoffsByCourseId,
    certifications: (certsRes.data ?? []) as Certification[],
  };
}

export interface TeamProgressRow {
  user: ProfileLite & { role: Role };
  totalLessons: number;
  completedLessons: number;
  quizPassedCount: number;
  quizAttempts: number;
  certificationsExpiringSoon: number;
}

/**
 * Manager view: every team member's progress across every course they're
 * assigned to via a training path. Heavy by design — gated by training_can_write
 * RLS upstream.
 */
export async function getTeamProgress(): Promise<TeamProgressRow[]> {
  const supabase = createSupabaseServerClient();
  const [staffRes, pathLinksRes, progressRes, attemptsRes, certsRes] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, role, is_active")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("user_training_paths")
        .select(
          "user_id, path:training_paths(id, path_courses:training_path_courses(course:training_courses(id, lessons:training_lessons(id))))",
        ),
      supabase.from("training_progress").select("user_id, lesson_id"),
      supabase.from("training_quiz_attempts").select("user_id, quiz_id, passed"),
      supabase
        .from("certifications")
        .select("user_id, expires_on")
        .not("expires_on", "is", null),
    ]);

  const staff = (staffRes.data ?? []) as (ProfileLite & {
    role: Role;
    is_active: boolean;
  })[];

  const assignedLessonsByUser = new Map<string, Set<string>>();
  type PathLinkRow = {
    user_id: string;
    path:
      | {
          id: string;
          path_courses:
            | { course: { id: string; lessons: { id: string }[] | null } | null }[]
            | null;
        }
      | null;
  };
  for (const link of (pathLinksRes.data ?? []) as unknown as PathLinkRow[]) {
    if (!link.path) continue;
    const set = assignedLessonsByUser.get(link.user_id) ?? new Set<string>();
    for (const pc of link.path.path_courses ?? []) {
      const lessons = pc.course?.lessons ?? [];
      for (const l of lessons) set.add(l.id);
    }
    assignedLessonsByUser.set(link.user_id, set);
  }

  const completedByUser = new Map<string, Set<string>>();
  for (const row of (progressRes.data ?? []) as {
    user_id: string;
    lesson_id: string;
  }[]) {
    const set = completedByUser.get(row.user_id) ?? new Set<string>();
    set.add(row.lesson_id);
    completedByUser.set(row.user_id, set);
  }

  const passedByUser = new Map<string, Set<string>>();
  const attemptsByUser = new Map<string, number>();
  for (const a of (attemptsRes.data ?? []) as {
    user_id: string;
    quiz_id: string;
    passed: boolean;
  }[]) {
    attemptsByUser.set(a.user_id, (attemptsByUser.get(a.user_id) ?? 0) + 1);
    if (a.passed) {
      const set = passedByUser.get(a.user_id) ?? new Set<string>();
      set.add(a.quiz_id);
      passedByUser.set(a.user_id, set);
    }
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 30);

  const expiringByUser = new Map<string, number>();
  for (const c of (certsRes.data ?? []) as {
    user_id: string;
    expires_on: string;
  }[]) {
    const d = new Date(c.expires_on);
    d.setHours(0, 0, 0, 0);
    if (d <= cutoff) {
      expiringByUser.set(c.user_id, (expiringByUser.get(c.user_id) ?? 0) + 1);
    }
  }

  return staff.map((p) => {
    const assigned = assignedLessonsByUser.get(p.id) ?? new Set<string>();
    const completed = completedByUser.get(p.id) ?? new Set<string>();
    let completedFromAssigned = 0;
    for (const id of assigned) if (completed.has(id)) completedFromAssigned += 1;
    return {
      user: {
        id: p.id,
        full_name: p.full_name,
        email: p.email,
        avatar_url: p.avatar_url,
        role: p.role,
      },
      totalLessons: assigned.size,
      completedLessons: completedFromAssigned,
      quizPassedCount: (passedByUser.get(p.id) ?? new Set()).size,
      quizAttempts: attemptsByUser.get(p.id) ?? 0,
      certificationsExpiringSoon: expiringByUser.get(p.id) ?? 0,
    };
  });
}

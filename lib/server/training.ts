import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  Certification,
  ProfileLite,
  Role,
  TrainingAnnouncement,
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

export async function getActiveAnnouncements(
  limit = 5,
): Promise<TrainingAnnouncement[]> {
  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("training_announcements")
    .select("*")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as TrainingAnnouncement[];
}

export interface SignoffRequest {
  user: ProfileLite & { role: Role };
  course: Pick<TrainingCourse, "id" | "title" | "slug">;
  lessonCount: number;
  lastCompletedAt: string;
}

/**
 * Employees who finished every active lesson of a course that requires
 * sign-off but don't yet have a signoff row. Manager-only call.
 */
export async function getPendingSignoffs(): Promise<SignoffRequest[]> {
  const supabase = createSupabaseServerClient();

  const { data: coursesRaw } = await supabase
    .from("training_courses")
    .select(
      "id, title, slug, requires_signoff, lessons:training_lessons(id, is_active)",
    )
    .eq("requires_signoff", true)
    .eq("is_active", true);

  type CourseRow = {
    id: string;
    title: string;
    slug: string;
    requires_signoff: boolean;
    lessons: { id: string; is_active: boolean }[] | null;
  };
  const courses = ((coursesRaw ?? []) as unknown as CourseRow[])
    .map((c) => ({
      ...c,
      activeLessonIds: (c.lessons ?? [])
        .filter((l) => l.is_active)
        .map((l) => l.id),
    }))
    .filter((c) => c.activeLessonIds.length > 0);
  if (courses.length === 0) return [];

  const allLessonIds = courses.flatMap((c) => c.activeLessonIds);
  const { data: progressRaw } = await supabase
    .from("training_progress")
    .select("user_id, lesson_id, completed_at")
    .in("lesson_id", allLessonIds);
  const progressByUserLesson = new Map<string, Map<string, string>>();
  for (const p of (progressRaw ?? []) as {
    user_id: string;
    lesson_id: string;
    completed_at: string;
  }[]) {
    const sub = progressByUserLesson.get(p.user_id) ?? new Map<string, string>();
    sub.set(p.lesson_id, p.completed_at);
    progressByUserLesson.set(p.user_id, sub);
  }

  const { data: signoffsRaw } = await supabase
    .from("training_signoffs")
    .select("user_id, course_id")
    .in(
      "course_id",
      courses.map((c) => c.id),
    );
  const signedSet = new Set(
    (signoffsRaw ?? []).map(
      (r: { user_id: string; course_id: string }) =>
        `${r.user_id}:${r.course_id}`,
    ),
  );

  const userIds = new Set<string>();
  const candidates: { userId: string; course: typeof courses[number]; lastDone: string }[] = [];
  for (const [userId, lessonMap] of progressByUserLesson) {
    for (const c of courses) {
      if (signedSet.has(`${userId}:${c.id}`)) continue;
      const allDone = c.activeLessonIds.every((id) => lessonMap.has(id));
      if (!allDone) continue;
      let lastDone = "";
      for (const id of c.activeLessonIds) {
        const t = lessonMap.get(id)!;
        if (t > lastDone) lastDone = t;
      }
      candidates.push({ userId, course: c, lastDone });
      userIds.add(userId);
    }
  }
  if (candidates.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email, avatar_url, role")
    .in("id", [...userIds]);
  const profileMap = new Map(
    ((profiles ?? []) as (ProfileLite & { role: Role })[]).map((p) => [
      p.id,
      p,
    ]),
  );

  return candidates
    .map((c) => {
      const p = profileMap.get(c.userId);
      if (!p) return null;
      return {
        user: p,
        course: { id: c.course.id, title: c.course.title, slug: c.course.slug },
        lessonCount: c.course.activeLessonIds.length,
        lastCompletedAt: c.lastDone,
      };
    })
    .filter((r): r is SignoffRequest => r !== null)
    .sort(
      (a, b) =>
        new Date(b.lastCompletedAt).getTime() -
        new Date(a.lastCompletedAt).getTime(),
    );
}

export interface CourseReportRow {
  course: Pick<TrainingCourse, "id" | "slug" | "title" | "is_required">;
  assignedUsers: number;
  completedUsers: number;
  pendingSignoffs: number;
}

/**
 * Course-level report: how many people are assigned (via paths), how
 * many have completed every lesson, how many are awaiting signoff.
 */
export async function getCourseReports(): Promise<CourseReportRow[]> {
  const supabase = createSupabaseServerClient();

  const { data: courses } = await supabase
    .from("training_courses")
    .select(
      "id, slug, title, is_required, requires_signoff, lessons:training_lessons(id, is_active)",
    )
    .eq("is_active", true)
    .order("title");

  type CRow = {
    id: string;
    slug: string;
    title: string;
    is_required: boolean;
    requires_signoff: boolean;
    lessons: { id: string; is_active: boolean }[] | null;
  };
  const rows = ((courses ?? []) as unknown as CRow[]).map((c) => ({
    ...c,
    activeLessons: (c.lessons ?? [])
      .filter((l) => l.is_active)
      .map((l) => l.id),
  }));

  const { data: pathLinks } = await supabase
    .from("user_training_paths")
    .select(
      "user_id, path:training_paths(path_courses:training_path_courses(course_id))",
    );
  const assignedByCourse = new Map<string, Set<string>>();
  type PL = {
    user_id: string;
    path: { path_courses: { course_id: string }[] | null } | null;
  };
  for (const link of ((pathLinks ?? []) as unknown as PL[])) {
    if (!link.path) continue;
    for (const pc of link.path.path_courses ?? []) {
      const set = assignedByCourse.get(pc.course_id) ?? new Set<string>();
      set.add(link.user_id);
      assignedByCourse.set(pc.course_id, set);
    }
  }

  const allLessonIds = rows.flatMap((r) => r.activeLessons);
  const { data: progress } = allLessonIds.length
    ? await supabase
        .from("training_progress")
        .select("user_id, lesson_id")
        .in("lesson_id", allLessonIds)
    : { data: [] as { user_id: string; lesson_id: string }[] };

  const doneByLesson = new Map<string, Set<string>>();
  for (const p of (progress ?? []) as {
    user_id: string;
    lesson_id: string;
  }[]) {
    const set = doneByLesson.get(p.lesson_id) ?? new Set<string>();
    set.add(p.user_id);
    doneByLesson.set(p.lesson_id, set);
  }

  const { data: signoffs } = await supabase
    .from("training_signoffs")
    .select("user_id, course_id");
  const signoffsByCourse = new Map<string, Set<string>>();
  for (const s of (signoffs ?? []) as {
    user_id: string;
    course_id: string;
  }[]) {
    const set = signoffsByCourse.get(s.course_id) ?? new Set<string>();
    set.add(s.user_id);
    signoffsByCourse.set(s.course_id, set);
  }

  return rows.map((r) => {
    const assigned = assignedByCourse.get(r.id) ?? new Set<string>();
    let completed = 0;
    for (const userId of assigned) {
      const allDone = r.activeLessons.every((lessonId) =>
        (doneByLesson.get(lessonId) ?? new Set()).has(userId),
      );
      if (allDone) completed += 1;
    }
    const signedOff = signoffsByCourse.get(r.id) ?? new Set<string>();
    let pendingSignoffs = 0;
    if (r.requires_signoff) {
      for (const userId of assigned) {
        if (signedOff.has(userId)) continue;
        const allDone = r.activeLessons.every((lessonId) =>
          (doneByLesson.get(lessonId) ?? new Set()).has(userId),
        );
        if (allDone) pendingSignoffs += 1;
      }
    }
    return {
      course: {
        id: r.id,
        slug: r.slug,
        title: r.title,
        is_required: r.is_required,
      },
      assignedUsers: assigned.size,
      completedUsers: completed,
      pendingSignoffs,
    };
  });
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

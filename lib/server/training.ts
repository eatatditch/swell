import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import type {
  Certification,
  Role,
  StaffTrainingPath,
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
  TrainingStaff,
  TrainingStaffType,
} from "@/lib/types/database";

export function canWriteContent(role: Role): boolean {
  return (
    role === "founder_admin" ||
    role === "general_manager" ||
    role === "service_manager" ||
    role === "kitchen_manager"
  );
}

/** A course is visible to a staff member if either it has no targeting or
 *  its targeting array includes that staff_type. */
export function courseVisibleTo(
  course: Pick<TrainingCourse, "applies_to_staff_types">,
  staffType: TrainingStaffType,
): boolean {
  const arr = course.applies_to_staff_types ?? [];
  return arr.length === 0 || arr.includes(staffType);
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

export async function getCourseList(
  staffType?: TrainingStaffType,
): Promise<CourseListItem[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_courses")
    .select("*, category:training_categories(*), lessons:training_lessons(id)")
    .order("sort_order")
    .order("title");
  const all = ((data ?? []) as (TrainingCourse & {
    category: TrainingCategory | null;
    lessons: { id: string }[];
  })[]).map((c) => ({
    ...c,
    lesson_count: c.lessons?.length ?? 0,
  }));
  if (!staffType) return all;
  return all.filter((c) => courseVisibleTo(c, staffType));
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

export interface StaffTrainingOverview {
  paths: (StaffTrainingPath & {
    path: TrainingPath & {
      path_courses: (TrainingPathCourse & { course: TrainingCourse })[];
    };
  })[];
  completedLessonIds: Set<string>;
  attemptsByQuizId: Map<string, TrainingQuizAttempt[]>;
  signoffsByCourseId: Map<string, TrainingSignoff>;
  certifications: Certification[];
}

export async function getStaffTrainingOverview(
  staffId: string,
): Promise<StaffTrainingOverview> {
  // Kiosk staff aren't authenticated; use the admin client to bypass RLS.
  const admin = createSupabaseAdminClient();
  const [pathsRes, progressRes, attemptsRes, signoffsRes, certsRes] =
    await Promise.all([
      admin
        .from("staff_training_paths")
        .select(
          "*, path:training_paths(*, path_courses:training_path_courses(*, course:training_courses(*)))",
        )
        .eq("staff_id", staffId)
        .order("created_at", { ascending: false }),
      admin
        .from("training_progress")
        .select("lesson_id, completed_at")
        .eq("staff_id", staffId),
      admin
        .from("training_quiz_attempts")
        .select("*")
        .eq("staff_id", staffId)
        .order("completed_at", { ascending: false }),
      admin
        .from("training_signoffs")
        .select("*")
        .eq("staff_id", staffId),
      admin
        .from("certifications")
        .select("*")
        .eq("staff_id", staffId)
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

  const paths = (pathsRes.data ?? []) as (StaffTrainingPath & {
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
  staff: Pick<TrainingStaff, "id" | "full_name" | "staff_type">;
  course: Pick<TrainingCourse, "id" | "title" | "slug">;
  lessonCount: number;
  lastCompletedAt: string;
}

/**
 * Staff who finished every active lesson of a sign-off-required course but
 * don't yet have a signoff row. Manager-only call.
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
    .select("staff_id, lesson_id, completed_at")
    .in("lesson_id", allLessonIds);
  const progressByStaffLesson = new Map<string, Map<string, string>>();
  for (const p of (progressRaw ?? []) as {
    staff_id: string;
    lesson_id: string;
    completed_at: string;
  }[]) {
    const sub = progressByStaffLesson.get(p.staff_id) ?? new Map<string, string>();
    sub.set(p.lesson_id, p.completed_at);
    progressByStaffLesson.set(p.staff_id, sub);
  }

  const { data: signoffsRaw } = await supabase
    .from("training_signoffs")
    .select("staff_id, course_id")
    .in(
      "course_id",
      courses.map((c) => c.id),
    );
  const signedSet = new Set(
    (signoffsRaw ?? []).map(
      (r: { staff_id: string; course_id: string }) =>
        `${r.staff_id}:${r.course_id}`,
    ),
  );

  const staffIds = new Set<string>();
  const candidates: {
    staffId: string;
    course: (typeof courses)[number];
    lastDone: string;
  }[] = [];
  for (const [staffId, lessonMap] of progressByStaffLesson) {
    for (const c of courses) {
      if (signedSet.has(`${staffId}:${c.id}`)) continue;
      const allDone = c.activeLessonIds.every((id) => lessonMap.has(id));
      if (!allDone) continue;
      let lastDone = "";
      for (const id of c.activeLessonIds) {
        const t = lessonMap.get(id)!;
        if (t > lastDone) lastDone = t;
      }
      candidates.push({ staffId, course: c, lastDone });
      staffIds.add(staffId);
    }
  }
  if (candidates.length === 0) return [];

  const { data: staffRows } = await supabase
    .from("training_staff")
    .select("id, full_name, staff_type")
    .in("id", [...staffIds]);
  const staffMap = new Map(
    ((staffRows ?? []) as Pick<TrainingStaff, "id" | "full_name" | "staff_type">[]).map(
      (s) => [s.id, s],
    ),
  );

  return candidates
    .map((c) => {
      const s = staffMap.get(c.staffId);
      if (!s) return null;
      return {
        staff: s,
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
  assignedStaff: number;
  completedStaff: number;
  pendingSignoffs: number;
  byStaffType: Record<TrainingStaffType, { assigned: number; completed: number }>;
}

/**
 * Per-course completion + breakdown by FOH/BOH/Mgmt.
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

  const { data: staffRows } = await supabase
    .from("training_staff")
    .select("id, staff_type")
    .eq("is_active", true);
  const staffTypeById = new Map<string, TrainingStaffType>();
  for (const s of (staffRows ?? []) as { id: string; staff_type: TrainingStaffType }[]) {
    staffTypeById.set(s.id, s.staff_type);
  }

  const { data: pathLinks } = await supabase
    .from("staff_training_paths")
    .select(
      "staff_id, path:training_paths(path_courses:training_path_courses(course_id))",
    );
  const assignedByCourse = new Map<string, Set<string>>();
  type PL = {
    staff_id: string;
    path: { path_courses: { course_id: string }[] | null } | null;
  };
  for (const link of ((pathLinks ?? []) as unknown as PL[])) {
    if (!link.path) continue;
    for (const pc of link.path.path_courses ?? []) {
      const set = assignedByCourse.get(pc.course_id) ?? new Set<string>();
      set.add(link.staff_id);
      assignedByCourse.set(pc.course_id, set);
    }
  }

  const allLessonIds = rows.flatMap((r) => r.activeLessons);
  const { data: progress } = allLessonIds.length
    ? await supabase
        .from("training_progress")
        .select("staff_id, lesson_id")
        .in("lesson_id", allLessonIds)
    : { data: [] as { staff_id: string; lesson_id: string }[] };

  const doneByLesson = new Map<string, Set<string>>();
  for (const p of (progress ?? []) as {
    staff_id: string;
    lesson_id: string;
  }[]) {
    const set = doneByLesson.get(p.lesson_id) ?? new Set<string>();
    set.add(p.staff_id);
    doneByLesson.set(p.lesson_id, set);
  }

  const { data: signoffs } = await supabase
    .from("training_signoffs")
    .select("staff_id, course_id");
  const signoffsByCourse = new Map<string, Set<string>>();
  for (const s of (signoffs ?? []) as {
    staff_id: string;
    course_id: string;
  }[]) {
    const set = signoffsByCourse.get(s.course_id) ?? new Set<string>();
    set.add(s.staff_id);
    signoffsByCourse.set(s.course_id, set);
  }

  return rows.map((r) => {
    const assigned = assignedByCourse.get(r.id) ?? new Set<string>();
    let completed = 0;
    const byStaffType: Record<TrainingStaffType, { assigned: number; completed: number }> = {
      foh: { assigned: 0, completed: 0 },
      boh: { assigned: 0, completed: 0 },
      management: { assigned: 0, completed: 0 },
    };

    for (const staffId of assigned) {
      const type = staffTypeById.get(staffId);
      const allDone = r.activeLessons.every((lessonId) =>
        (doneByLesson.get(lessonId) ?? new Set()).has(staffId),
      );
      if (type) {
        byStaffType[type].assigned += 1;
        if (allDone) byStaffType[type].completed += 1;
      }
      if (allDone) completed += 1;
    }

    const signedOff = signoffsByCourse.get(r.id) ?? new Set<string>();
    let pendingSignoffs = 0;
    if (r.requires_signoff) {
      for (const staffId of assigned) {
        if (signedOff.has(staffId)) continue;
        const allDone = r.activeLessons.every((lessonId) =>
          (doneByLesson.get(lessonId) ?? new Set()).has(staffId),
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
      assignedStaff: assigned.size,
      completedStaff: completed,
      pendingSignoffs,
      byStaffType,
    };
  });
}

export interface TeamProgressRow {
  staff: Pick<TrainingStaff, "id" | "full_name" | "staff_type">;
  totalLessons: number;
  completedLessons: number;
  quizPassedCount: number;
  quizAttempts: number;
  certificationsExpiringSoon: number;
}

/**
 * Per-staff progress across every course they're assigned to via a path.
 */
export async function getTeamProgress(): Promise<TeamProgressRow[]> {
  const supabase = createSupabaseServerClient();
  const [staffRes, pathLinksRes, progressRes, attemptsRes, certsRes] =
    await Promise.all([
      supabase
        .from("training_staff")
        .select("id, full_name, staff_type")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("staff_training_paths")
        .select(
          "staff_id, path:training_paths(id, path_courses:training_path_courses(course:training_courses(id, lessons:training_lessons(id))))",
        ),
      supabase.from("training_progress").select("staff_id, lesson_id"),
      supabase
        .from("training_quiz_attempts")
        .select("staff_id, quiz_id, passed"),
      supabase
        .from("certifications")
        .select("staff_id, expires_on")
        .not("expires_on", "is", null),
    ]);

  const staff = (staffRes.data ?? []) as Pick<
    TrainingStaff,
    "id" | "full_name" | "staff_type"
  >[];

  const assignedLessonsByStaff = new Map<string, Set<string>>();
  type PathLinkRow = {
    staff_id: string;
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
    const set = assignedLessonsByStaff.get(link.staff_id) ?? new Set<string>();
    for (const pc of link.path.path_courses ?? []) {
      const lessons = pc.course?.lessons ?? [];
      for (const l of lessons) set.add(l.id);
    }
    assignedLessonsByStaff.set(link.staff_id, set);
  }

  const completedByStaff = new Map<string, Set<string>>();
  for (const row of (progressRes.data ?? []) as {
    staff_id: string;
    lesson_id: string;
  }[]) {
    const set = completedByStaff.get(row.staff_id) ?? new Set<string>();
    set.add(row.lesson_id);
    completedByStaff.set(row.staff_id, set);
  }

  const passedByStaff = new Map<string, Set<string>>();
  const attemptsByStaff = new Map<string, number>();
  for (const a of (attemptsRes.data ?? []) as {
    staff_id: string;
    quiz_id: string;
    passed: boolean;
  }[]) {
    attemptsByStaff.set(a.staff_id, (attemptsByStaff.get(a.staff_id) ?? 0) + 1);
    if (a.passed) {
      const set = passedByStaff.get(a.staff_id) ?? new Set<string>();
      set.add(a.quiz_id);
      passedByStaff.set(a.staff_id, set);
    }
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + 30);

  const expiringByStaff = new Map<string, number>();
  for (const c of (certsRes.data ?? []) as {
    staff_id: string;
    expires_on: string;
  }[]) {
    const d = new Date(c.expires_on);
    d.setHours(0, 0, 0, 0);
    if (d <= cutoff) {
      expiringByStaff.set(c.staff_id, (expiringByStaff.get(c.staff_id) ?? 0) + 1);
    }
  }

  return staff.map((s) => {
    const assigned = assignedLessonsByStaff.get(s.id) ?? new Set<string>();
    const completed = completedByStaff.get(s.id) ?? new Set<string>();
    let completedFromAssigned = 0;
    for (const id of assigned) if (completed.has(id)) completedFromAssigned += 1;
    return {
      staff: s,
      totalLessons: assigned.size,
      completedLessons: completedFromAssigned,
      quizPassedCount: (passedByStaff.get(s.id) ?? new Set()).size,
      quizAttempts: attemptsByStaff.get(s.id) ?? 0,
      certificationsExpiringSoon: expiringByStaff.get(s.id) ?? 0,
    };
  });
}

/** Manager view: a summary roll-up by staff_type. */
export interface StaffTypeSummary {
  staffType: TrainingStaffType;
  staffCount: number;
  assignedLessons: number;
  completedLessons: number;
  completionPct: number;
}

export async function getStaffTypeSummary(): Promise<StaffTypeSummary[]> {
  const rows = await getTeamProgress();
  const byType = new Map<
    TrainingStaffType,
    { count: number; assigned: number; completed: number }
  >();
  for (const r of rows) {
    const cur = byType.get(r.staff.staff_type) ?? {
      count: 0,
      assigned: 0,
      completed: 0,
    };
    cur.count += 1;
    cur.assigned += r.totalLessons;
    cur.completed += r.completedLessons;
    byType.set(r.staff.staff_type, cur);
  }
  const order: TrainingStaffType[] = ["foh", "boh", "management"];
  return order.map((t) => {
    const v = byType.get(t) ?? { count: 0, assigned: 0, completed: 0 };
    return {
      staffType: t,
      staffCount: v.count,
      assignedLessons: v.assigned,
      completedLessons: v.completed,
      completionPct:
        v.assigned === 0 ? 0 : Math.round((v.completed / v.assigned) * 100),
    };
  });
}

export async function listAllTrainingStaff(): Promise<
  (TrainingStaff & { location_name: string | null })[]
> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("training_staff")
    .select("*, location:locations(name)")
    .order("is_active", { ascending: false })
    .order("full_name");
  type Row = TrainingStaff & { location: { name: string } | null };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    ...r,
    location_name: r.location?.name ?? null,
  }));
}

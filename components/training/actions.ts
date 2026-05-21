"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin-server";
import { logActivity } from "@/lib/server/activity";
import { notify } from "@/lib/server/notifications";
import { canWriteContent } from "@/lib/server/training";
import { shortAnswerMatches } from "@/lib/constants/training";
import { ROLES } from "@/lib/constants/roles";
import type { Role, TrainingQuestionKind } from "@/lib/types/database";

async function requireUser() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .single();
  if (!profile) return { supabase, error: "No profile" as const };
  return {
    supabase,
    userId: user.id,
    role: profile.role as Role,
  };
}

async function requireManager() {
  const ctx = await requireUser();
  if ("error" in ctx && ctx.error) return ctx;
  if (!ctx.role || !canWriteContent(ctx.role)) {
    return { ...ctx, error: "Managers only" as const };
  }
  return ctx;
}

// ---------------------------------------------------------------------------
// Lesson completion
// ---------------------------------------------------------------------------

const completeLessonSchema = z.object({
  lessonId: z.string().uuid(),
  timeSpentSeconds: z.number().int().min(0).max(86_400).optional().nullable(),
});

export async function completeLesson(
  raw: z.input<typeof completeLessonSchema>,
) {
  const { supabase, userId, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const parsed = completeLessonSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: progress, error } = await supabase
    .from("training_progress")
    .upsert(
      {
        user_id: userId,
        lesson_id: v.lessonId,
        completed_at: new Date().toISOString(),
        time_spent_seconds: v.timeSpentSeconds ?? null,
      },
      { onConflict: "user_id,lesson_id" },
    )
    .select("*, lesson:training_lessons(id, title, course_id)")
    .single();

  if (error || !progress) {
    return { error: error?.message ?? "Could not mark complete" };
  }

  await logActivity({
    verb: "completed",
    objectType: "training_lesson",
    objectId: v.lessonId,
    summary: (progress as { lesson?: { title?: string | null } | null })
      .lesson?.title ?? "Lesson",
  });

  // Fire a sign-off-request notification when the user just finished the
  // final lesson of a course that requires manager sign-off.
  const courseId =
    (progress as { lesson?: { course_id?: string | null } | null }).lesson
      ?.course_id ?? null;
  if (courseId) {
    await notifySignoffIfReady(supabase, userId, courseId);
  }

  revalidatePath("/training", "layout");
  return { ok: true };
}

async function notifySignoffIfReady(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  userId: string,
  courseId: string,
) {
  const { data: course } = await supabase
    .from("training_courses")
    .select(
      "id, title, requires_signoff, lessons:training_lessons(id, is_active)",
    )
    .eq("id", courseId)
    .maybeSingle();
  if (
    !course ||
    !(course as { requires_signoff?: boolean }).requires_signoff
  ) {
    return;
  }
  const lessons = ((course as {
    lessons?: { id: string; is_active: boolean }[] | null;
  }).lessons ?? []).filter((l) => l.is_active);
  if (lessons.length === 0) return;

  const { data: done } = await supabase
    .from("training_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .in(
      "lesson_id",
      lessons.map((l) => l.id),
    );
  const doneIds = new Set(
    (done ?? []).map((p: { lesson_id: string }) => p.lesson_id),
  );
  if (doneIds.size < lessons.length) return;

  const { data: existingSignoff } = await supabase
    .from("training_signoffs")
    .select("id")
    .eq("user_id", userId)
    .eq("course_id", courseId)
    .maybeSingle();
  if (existingSignoff) return;

  // Notify every manager-role profile.
  const admin = createSupabaseAdminClient();
  const { data: managers } = await admin
    .from("profiles")
    .select("id")
    .in("role", [
      "founder_admin",
      "general_manager",
      "service_manager",
      "kitchen_manager",
    ])
    .eq("is_active", true);
  if (!managers || managers.length === 0) return;
  const title =
    (course as { title?: string | null }).title ?? "Training course";
  for (const m of managers as { id: string }[]) {
    if (m.id === userId) continue;
    await notify({
      recipientId: m.id,
      kind: "training_signoff_requested",
      title: "Sign-off requested",
      body: title,
      link: "/training/progress",
      sourceType: "training_course",
      sourceId: courseId,
    });
  }
}

// ---------------------------------------------------------------------------
// Quiz submission (server-graded)
// ---------------------------------------------------------------------------

const quizSubmitSchema = z.object({
  quizId: z.string().uuid(),
  startedAt: z.string().datetime().optional(),
  answers: z.record(z.string(), z.string()),
});

export interface QuizSubmitResult {
  score: number;
  passed: boolean;
  feedback: Record<
    string,
    {
      correct: boolean;
      explanation: string | null;
      correctOptionId: string | null;
      correctText: string | null;
    }
  >;
  attemptId: string;
  attemptsRemaining: number | null;
}

export async function submitQuiz(
  raw: z.input<typeof quizSubmitSchema>,
): Promise<QuizSubmitResult | { error: string }> {
  const { supabase, userId, error: authError } = await requireUser();
  if (authError) return { error: authError };

  const parsed = quizSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: quiz, error: quizErr } = await supabase
    .from("training_quizzes")
    .select(
      "*, questions:training_quiz_questions(*, options:training_quiz_options(*))",
    )
    .eq("id", v.quizId)
    .maybeSingle();
  if (quizErr || !quiz) return { error: quizErr?.message ?? "Quiz not found" };

  const questions = (
    quiz as {
      questions:
        | {
            id: string;
            kind: TrainingQuestionKind;
            correct_text: string | null;
            explanation: string | null;
            options:
              | { id: string; is_correct: boolean; label: string }[]
              | null;
          }[]
        | null;
      retry_limit: number;
      passing_score: number;
    }
  ).questions ?? [];

  // Retry-limit check.
  if (quiz.retry_limit > 0) {
    const { count } = await supabase
      .from("training_quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quiz_id", v.quizId);
    if ((count ?? 0) >= quiz.retry_limit) {
      return { error: "Max attempts reached" };
    }
  }

  const feedback: QuizSubmitResult["feedback"] = {};
  let correct = 0;
  for (const q of questions) {
    const given = v.answers[q.id] ?? "";
    let isCorrect = false;
    let correctOptionId: string | null = null;
    let correctText: string | null = q.correct_text;

    if (q.kind === "short_answer") {
      isCorrect = shortAnswerMatches(given, q.correct_text);
    } else {
      const correctOption = (q.options ?? []).find((o) => o.is_correct);
      correctOptionId = correctOption?.id ?? null;
      correctText = correctOption?.label ?? null;
      isCorrect = !!correctOption && given === correctOption.id;
    }

    if (isCorrect) correct += 1;
    feedback[q.id] = {
      correct: isCorrect,
      explanation: q.explanation,
      correctOptionId,
      correctText,
    };
  }

  const score = questions.length
    ? Math.round((correct / questions.length) * 100)
    : 0;
  const passed = score >= quiz.passing_score;

  const { data: attempt, error: insertErr } = await supabase
    .from("training_quiz_attempts")
    .insert({
      quiz_id: v.quizId,
      user_id: userId,
      score,
      passed,
      answers: v.answers,
      started_at: v.startedAt ?? new Date().toISOString(),
      completed_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (insertErr || !attempt) {
    return { error: insertErr?.message ?? "Could not save attempt" };
  }

  await logActivity({
    verb: passed ? "completed" : "updated",
    objectType: "training_quiz",
    objectId: v.quizId,
    summary: passed ? `Passed quiz · ${score}%` : `Quiz attempt · ${score}%`,
    metadata: { score, passed },
  });

  let attemptsRemaining: number | null = null;
  if (quiz.retry_limit > 0) {
    const { count } = await supabase
      .from("training_quiz_attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("quiz_id", v.quizId);
    attemptsRemaining = Math.max(0, quiz.retry_limit - (count ?? 0));
  }

  revalidatePath("/training", "layout");
  return { score, passed, feedback, attemptId: attempt.id, attemptsRemaining };
}

// ---------------------------------------------------------------------------
// Path assignment + auto-assign by role
// ---------------------------------------------------------------------------

const assignPathSchema = z.object({
  userId: z.string().uuid(),
  pathId: z.string().uuid(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
});

export async function assignPathToUser(
  raw: z.input<typeof assignPathSchema>,
) {
  const { supabase, userId, error: authError } = await requireManager();
  if (authError) return { error: authError };

  const parsed = assignPathSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("user_training_paths")
    .upsert(
      {
        user_id: v.userId,
        path_id: v.pathId,
        assigned_by: userId,
        assigned_reason: "manual",
        due_date: v.dueDate ?? null,
      },
      { onConflict: "user_id,path_id" },
    )
    .select("*, path:training_paths(id, name)")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Could not assign path" };
  }

  const pathName =
    (data as { path?: { name?: string | null } | null }).path?.name ?? "Path";
  await logActivity({
    verb: "created",
    objectType: "user_training_path",
    objectId: data.id,
    summary: pathName,
  });

  if (v.userId !== userId) {
    await notify({
      recipientId: v.userId,
      kind: "training_path_assigned",
      title: "New training assigned",
      body: pathName,
      link: "/training",
      sourceType: "user_training_path",
      sourceId: data.id,
    });
  }

  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function unassignPath(userPathId: string) {
  const { supabase, error: authError } = await requireManager();
  if (authError) return { error: authError };
  const { error } = await supabase
    .from("user_training_paths")
    .delete()
    .eq("id", userPathId);
  if (error) return { error: error.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const autoAssignSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ROLES as [string, ...string[]]),
});

/**
 * Find every active path that targets the user's role and assign them to it,
 * skipping any path they already hold. Returns how many paths were added.
 */
export async function autoAssignPathsByRole(
  raw: z.input<typeof autoAssignSchema>,
) {
  const { supabase, userId, error: authError } = await requireManager();
  if (authError) return { error: authError };

  const parsed = autoAssignSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: paths } = await supabase
    .from("training_paths")
    .select("id, name, course_interval_days, path_courses:training_path_courses(id)")
    .eq("is_active", true)
    .contains("target_roles", [v.role]);

  if (!paths || paths.length === 0) return { added: 0 };

  const { data: existing } = await supabase
    .from("user_training_paths")
    .select("path_id")
    .eq("user_id", v.userId);
  const already = new Set((existing ?? []).map((r) => r.path_id as string));

  const toInsert = paths
    .filter((p) => !already.has(p.id as string))
    .map((p) => {
      const moduleCount = (p.path_courses as { id: string }[] | null)?.length ?? 0;
      const intervalDays =
        (p.course_interval_days as number | null) ?? 7;
      const dueAt =
        moduleCount > 0
          ? new Date(Date.now() + moduleCount * intervalDays * 86_400_000)
          : null;
      return {
        user_id: v.userId,
        path_id: p.id as string,
        assigned_by: userId,
        assigned_reason: "role" as const,
        due_date: dueAt ? dueAt.toISOString().slice(0, 10) : null,
      };
    });

  if (toInsert.length === 0) return { added: 0 };

  const { error } = await supabase.from("user_training_paths").insert(toInsert);
  if (error) return { error: error.message };

  await logActivity({
    verb: "created",
    objectType: "user_training_path",
    objectId: v.userId,
    summary: `Auto-assigned ${toInsert.length} path(s) for ${v.role}`,
    metadata: { role: v.role, count: toInsert.length },
  });

  revalidatePath("/training", "layout");
  return { added: toInsert.length };
}

// ---------------------------------------------------------------------------
// Sign-offs
// ---------------------------------------------------------------------------

const signoffSchema = z.object({
  userId: z.string().uuid(),
  courseId: z.string().uuid(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function signOffCourse(raw: z.input<typeof signoffSchema>) {
  const { supabase, userId, error: authError } = await requireManager();
  if (authError) return { error: authError };

  const parsed = signoffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("training_signoffs")
    .upsert(
      {
        user_id: v.userId,
        course_id: v.courseId,
        signed_by: userId,
        signed_at: new Date().toISOString(),
        notes: v.notes?.trim() || null,
      },
      { onConflict: "user_id,course_id" },
    )
    .select("*, course:training_courses(id, title)")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not sign off" };
  }

  const courseTitle =
    (data as { course?: { title?: string | null } | null }).course?.title ??
    "Course";
  await logActivity({
    verb: "signed_off",
    objectType: "training_course",
    objectId: v.courseId,
    summary: courseTitle,
    metadata: { user_id: v.userId },
  });

  if (v.userId !== userId) {
    await notify({
      recipientId: v.userId,
      kind: "training_signed_off",
      title: "You're signed off",
      body: courseTitle,
      link: "/training",
      sourceType: "training_course",
      sourceId: v.courseId,
    });
  }

  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function removeSignoff(signoffId: string) {
  const { supabase, error: authError } = await requireManager();
  if (authError) return { error: authError };
  const { error } = await supabase
    .from("training_signoffs")
    .delete()
    .eq("id", signoffId);
  if (error) return { error: error.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Certifications
// ---------------------------------------------------------------------------

const certSchema = z.object({
  userId: z.string().uuid(),
  kind: z.string().min(1, "Kind is required").max(80),
  name: z.string().min(1, "Name is required").max(200),
  issuingBody: z.string().max(200).optional().nullable(),
  issuedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .nullable(),
  documentUrl: z.string().url().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createCertification(raw: z.input<typeof certSchema>) {
  const { supabase, userId, error: authError } = await requireManager();
  if (authError) return { error: authError };

  const parsed = certSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data, error } = await supabase
    .from("certifications")
    .insert({
      created_by: userId,
      user_id: v.userId,
      kind: v.kind.trim(),
      name: v.name.trim(),
      issuing_body: v.issuingBody?.trim() || null,
      issued_on: v.issuedOn,
      expires_on: v.expiresOn ?? null,
      document_url: v.documentUrl?.trim() || null,
      notes: v.notes?.trim() || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    return { error: error?.message ?? "Could not save certification" };
  }

  await logActivity({
    verb: "created",
    objectType: "certification",
    objectId: data.id,
    summary: `${v.name} for user`,
  });

  revalidatePath("/training", "layout");
  return { certification: data };
}

export async function deleteCertification(id: string) {
  const { supabase, error: authError } = await requireManager();
  if (authError) return { error: authError };
  const { error } = await supabase
    .from("certifications")
    .delete()
    .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

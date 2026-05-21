"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canWriteContent } from "@/lib/server/training";
import { slugify } from "@/lib/constants/training";
import { ROLES } from "@/lib/constants/roles";
import { TRAINING_QUESTION_KINDS } from "@/lib/constants/training";
import { TRAINING_RESOURCE_KINDS } from "@/lib/constants/training";
import type { Role } from "@/lib/types/database";

async function requireManager() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, error: "Not signed in" as const };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile || !canWriteContent(profile.role as Role)) {
    return { supabase, error: "Managers only" as const };
  }
  return { supabase, userId: user.id };
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

const categorySchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional().nullable(),
  department: z.string().max(40).optional().nullable(),
  icon: z.string().max(40).optional().nullable(),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export async function createCategory(raw: z.input<typeof categorySchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = categorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_categories")
    .insert({
      created_by: userId,
      slug: slugify(v.name),
      name: v.name.trim(),
      description: v.description?.trim() || null,
      department: v.department || null,
      icon: v.icon || null,
      sort_order: v.sortOrder,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { category: data };
}

const categoryUpdateSchema = categorySchema.partial().extend({
  id: z.string().uuid(),
});

export async function updateCategory(
  raw: z.input<typeof categoryUpdateSchema>,
) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = categoryUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.name !== undefined) patch.name = v.name.trim();
  if (v.description !== undefined)
    patch.description = v.description?.trim() || null;
  if (v.department !== undefined) patch.department = v.department || null;
  if (v.icon !== undefined) patch.icon = v.icon || null;
  if (v.sortOrder !== undefined) patch.sort_order = v.sortOrder;
  const { error: updateErr } = await supabase
    .from("training_categories")
    .update(patch)
    .eq("id", v.id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_categories")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

const courseSchema = z.object({
  categoryId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
  isRequired: z.boolean().default(false),
  requiresSignoff: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
  tags: z.array(z.string().max(40)).default([]),
  targetRoles: z.array(z.enum(ROLES as [string, ...string[]])).default([]),
});

export async function createCourse(raw: z.input<typeof courseSchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = courseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_courses")
    .insert({
      created_by: userId,
      category_id: v.categoryId ?? null,
      slug: slugify(v.title),
      title: v.title.trim(),
      description: v.description?.trim() || null,
      estimated_minutes: v.estimatedMinutes ?? null,
      is_required: v.isRequired,
      requires_signoff: v.requiresSignoff,
      sort_order: v.sortOrder,
      tags: v.tags,
      target_roles: v.targetRoles,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { course: data };
}

const courseUpdateSchema = courseSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export async function updateCourse(raw: z.input<typeof courseUpdateSchema>) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = courseUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.categoryId !== undefined) patch.category_id = v.categoryId ?? null;
  if (v.title !== undefined) patch.title = v.title.trim();
  if (v.description !== undefined)
    patch.description = v.description?.trim() || null;
  if (v.estimatedMinutes !== undefined)
    patch.estimated_minutes = v.estimatedMinutes ?? null;
  if (v.isRequired !== undefined) patch.is_required = v.isRequired;
  if (v.requiresSignoff !== undefined)
    patch.requires_signoff = v.requiresSignoff;
  if (v.sortOrder !== undefined) patch.sort_order = v.sortOrder;
  if (v.tags !== undefined) patch.tags = v.tags;
  if (v.targetRoles !== undefined) patch.target_roles = v.targetRoles;
  if (v.isActive !== undefined) patch.is_active = v.isActive;
  const { error: updateErr } = await supabase
    .from("training_courses")
    .update(patch)
    .eq("id", v.id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function deleteCourse(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_courses")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

const lessonSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  position: z.number().int().min(0).max(10_000).default(0),
  content: z.string().max(50_000).optional().nullable(),
  videoUrl: z.string().url().optional().nullable(),
  estimatedMinutes: z.number().int().min(1).max(1440).optional().nullable(),
});

export async function createLesson(raw: z.input<typeof lessonSchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = lessonSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_lessons")
    .insert({
      created_by: userId,
      course_id: v.courseId,
      slug: slugify(v.title),
      title: v.title.trim(),
      position: v.position,
      content: v.content?.trim() || null,
      video_url: v.videoUrl?.trim() || null,
      estimated_minutes: v.estimatedMinutes ?? null,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { lesson: data };
}

const lessonUpdateSchema = lessonSchema.partial().extend({
  id: z.string().uuid(),
  isActive: z.boolean().optional(),
});

export async function updateLesson(raw: z.input<typeof lessonUpdateSchema>) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = lessonUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.title !== undefined) patch.title = v.title.trim();
  if (v.position !== undefined) patch.position = v.position;
  if (v.content !== undefined) patch.content = v.content?.trim() || null;
  if (v.videoUrl !== undefined) patch.video_url = v.videoUrl?.trim() || null;
  if (v.estimatedMinutes !== undefined)
    patch.estimated_minutes = v.estimatedMinutes ?? null;
  if (v.isActive !== undefined) patch.is_active = v.isActive;
  const { error: updateErr } = await supabase
    .from("training_lessons")
    .update(patch)
    .eq("id", v.id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const reorderLessonsSchema = z.object({
  courseId: z.string().uuid(),
  ids: z.array(z.string().uuid()).min(1).max(200),
});

export async function reorderLessons(
  raw: z.input<typeof reorderLessonsSchema>,
) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = reorderLessonsSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  // Two-pass to avoid the (course_id, position) unique-constraint conflict:
  // park every position above any possible existing value, then assign final.
  const tempBase = 100_000;
  for (let i = 0; i < v.ids.length; i += 1) {
    const { error: tempErr } = await supabase
      .from("training_lessons")
      .update({ position: tempBase + i })
      .eq("id", v.ids[i])
      .eq("course_id", v.courseId);
    if (tempErr) return { error: tempErr.message };
  }
  for (let i = 0; i < v.ids.length; i += 1) {
    const { error: finalErr } = await supabase
      .from("training_lessons")
      .update({ position: (i + 1) * 10 })
      .eq("id", v.ids[i])
      .eq("course_id", v.courseId);
    if (finalErr) return { error: finalErr.message };
  }
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function deleteLesson(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_lessons")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const lessonResourceSchema = z.object({
  lessonId: z.string().uuid(),
  kind: z.enum(TRAINING_RESOURCE_KINDS as [string, ...string[]]),
  url: z.string().url(),
  label: z.string().max(200).optional().nullable(),
  position: z.number().int().min(0).max(10_000).default(0),
  isPrintable: z.boolean().default(false),
});

export async function addLessonResource(
  raw: z.input<typeof lessonResourceSchema>,
) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = lessonResourceSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_lesson_resources")
    .insert({
      created_by: userId,
      lesson_id: v.lessonId,
      kind: v.kind,
      url: v.url.trim(),
      label: v.label?.trim() || null,
      position: v.position,
      is_printable: v.isPrintable,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { resource: data };
}

export async function deleteLessonResource(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_lesson_resources")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Quizzes
// ---------------------------------------------------------------------------

const quizSchema = z.object({
  lessonId: z.string().uuid().optional().nullable(),
  courseId: z.string().uuid().optional().nullable(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  passingScore: z.number().int().min(0).max(100).default(80),
  retryLimit: z.number().int().min(0).max(100).default(0),
});

export async function createQuiz(raw: z.input<typeof quizSchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = quizSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  if (!v.lessonId && !v.courseId) {
    return { error: "Quiz needs a course or lesson" };
  }
  const { data, error: insertErr } = await supabase
    .from("training_quizzes")
    .insert({
      created_by: userId,
      lesson_id: v.lessonId ?? null,
      course_id: v.courseId ?? null,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      passing_score: v.passingScore,
      retry_limit: v.retryLimit,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { quiz: data };
}

export async function deleteQuiz(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_quizzes")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const questionSchema = z.object({
  quizId: z.string().uuid(),
  kind: z.enum(TRAINING_QUESTION_KINDS as [string, ...string[]]),
  prompt: z.string().min(1).max(1000),
  explanation: z.string().max(2000).optional().nullable(),
  position: z.number().int().min(0).max(10_000).default(0),
  correctText: z.string().max(500).optional().nullable(),
  options: z
    .array(
      z.object({
        label: z.string().min(1).max(500),
        isCorrect: z.boolean().default(false),
      }),
    )
    .max(20)
    .optional()
    .default([]),
});

export async function createQuestion(raw: z.input<typeof questionSchema>) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = questionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;

  const { data: q, error: qErr } = await supabase
    .from("training_quiz_questions")
    .insert({
      quiz_id: v.quizId,
      kind: v.kind,
      prompt: v.prompt.trim(),
      explanation: v.explanation?.trim() || null,
      position: v.position,
      correct_text: v.kind === "short_answer" ? v.correctText?.trim() || null : null,
    })
    .select("*")
    .single();
  if (qErr || !q) return { error: qErr?.message ?? "Could not create question" };

  if (v.kind !== "short_answer" && v.options.length > 0) {
    const rows = v.options.map((o, i) => ({
      question_id: q.id,
      label: o.label.trim(),
      is_correct: o.isCorrect,
      position: (i + 1) * 10,
    }));
    const { error: optErr } = await supabase
      .from("training_quiz_options")
      .insert(rows);
    if (optErr) return { error: optErr.message };
  }

  revalidatePath("/training", "layout");
  return { question: q };
}

const questionUpdateSchema = z.object({
  id: z.string().uuid(),
  prompt: z.string().min(1).max(1000).optional(),
  explanation: z.string().max(2000).optional().nullable(),
  position: z.number().int().min(0).max(10_000).optional(),
  correctText: z.string().max(500).optional().nullable(),
});

export async function updateQuestion(
  raw: z.input<typeof questionUpdateSchema>,
) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = questionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.prompt !== undefined) patch.prompt = v.prompt.trim();
  if (v.explanation !== undefined)
    patch.explanation = v.explanation?.trim() || null;
  if (v.position !== undefined) patch.position = v.position;
  if (v.correctText !== undefined)
    patch.correct_text = v.correctText?.trim() || null;
  const { error: updateErr } = await supabase
    .from("training_quiz_questions")
    .update(patch)
    .eq("id", v.id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const optionSchema = z.object({
  questionId: z.string().uuid(),
  label: z.string().min(1).max(500),
  isCorrect: z.boolean().default(false),
  position: z.number().int().min(0).max(10_000).default(0),
});

export async function addQuizOption(raw: z.input<typeof optionSchema>) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = optionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_quiz_options")
    .insert({
      question_id: v.questionId,
      label: v.label.trim(),
      is_correct: v.isCorrect,
      position: v.position,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { option: data };
}

const optionUpdateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(500).optional(),
  isCorrect: z.boolean().optional(),
  position: z.number().int().min(0).max(10_000).optional(),
});

export async function updateQuizOption(
  raw: z.input<typeof optionUpdateSchema>,
) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = optionUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const patch: Record<string, unknown> = {};
  if (v.label !== undefined) patch.label = v.label.trim();
  if (v.isCorrect !== undefined) patch.is_correct = v.isCorrect;
  if (v.position !== undefined) patch.position = v.position;
  const { error: updateErr } = await supabase
    .from("training_quiz_options")
    .update(patch)
    .eq("id", v.id);
  if (updateErr) return { error: updateErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function deleteQuizOption(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_quiz_options")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function deleteQuestion(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_quiz_questions")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const pathSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  targetRoles: z.array(z.enum(ROLES as [string, ...string[]])).default([]),
  targetDepartment: z.string().max(40).optional().nullable(),
  courseIntervalDays: z.number().int().min(1).max(365).default(7),
});

export async function createPath(raw: z.input<typeof pathSchema>) {
  const { supabase, userId, error } = await requireManager();
  if (error) return { error };
  const parsed = pathSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { data, error: insertErr } = await supabase
    .from("training_paths")
    .insert({
      created_by: userId,
      name: v.name.trim(),
      description: v.description?.trim() || null,
      target_roles: v.targetRoles,
      target_department: v.targetDepartment || null,
      course_interval_days: v.courseIntervalDays,
    })
    .select("*")
    .single();
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { path: data };
}

export async function deletePath(id: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_paths")
    .delete()
    .eq("id", id);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

const pathCourseSchema = z.object({
  pathId: z.string().uuid(),
  courseId: z.string().uuid(),
  position: z.number().int().min(0).max(10_000).default(0),
  isRequired: z.boolean().default(true),
});

export async function addCourseToPath(
  raw: z.input<typeof pathCourseSchema>,
) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const parsed = pathCourseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const v = parsed.data;
  const { error: insertErr } = await supabase
    .from("training_path_courses")
    .upsert(
      {
        path_id: v.pathId,
        course_id: v.courseId,
        position: v.position,
        is_required: v.isRequired,
      },
      { onConflict: "path_id,course_id" },
    );
  if (insertErr) return { error: insertErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

export async function removeCourseFromPath(linkId: string) {
  const { supabase, error } = await requireManager();
  if (error) return { error };
  const { error: delErr } = await supabase
    .from("training_path_courses")
    .delete()
    .eq("id", linkId);
  if (delErr) return { error: delErr.message };
  revalidatePath("/training", "layout");
  return { ok: true };
}

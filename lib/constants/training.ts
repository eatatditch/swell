import type {
  TrainingQuestionKind,
  TrainingResourceKind,
} from "@/lib/types/database";

export const TRAINING_QUESTION_KINDS: TrainingQuestionKind[] = [
  "multiple_choice",
  "true_false",
  "short_answer",
];

export const TRAINING_QUESTION_KIND_LABELS: Record<
  TrainingQuestionKind,
  string
> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  short_answer: "Short answer",
};

export const TRAINING_RESOURCE_KINDS: TrainingResourceKind[] = [
  "video",
  "pdf",
  "image",
  "link",
  "download",
];

export const TRAINING_RESOURCE_KIND_LABELS: Record<
  TrainingResourceKind,
  string
> = {
  video: "Video",
  pdf: "PDF",
  image: "Image",
  link: "Link",
  download: "Download",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function normalizeAnswer(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match short-answer accepted answers (pipe-separated). */
export function shortAnswerMatches(
  given: string,
  correctText: string | null | undefined,
): boolean {
  if (!correctText) return false;
  const norm = normalizeAnswer(given);
  if (!norm) return false;
  return correctText
    .split("|")
    .map((s) => normalizeAnswer(s))
    .filter((s) => s.length > 0)
    .some((accepted) => norm.includes(accepted));
}

export interface ExpiryBucket {
  label: string;
  tone: "ok" | "soon" | "overdue";
}

export function expiryBucket(expiresOn: string | null): ExpiryBucket | null {
  if (!expiresOn) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const exp = new Date(expiresOn);
  exp.setHours(0, 0, 0, 0);
  const days = Math.round((exp.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)}d ago`, tone: "overdue" };
  if (days <= 30) return { label: `Expires in ${days}d`, tone: "soon" };
  return { label: `Expires ${expiresOn}`, tone: "ok" };
}

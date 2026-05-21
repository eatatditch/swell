import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getCourseReports,
  getTeamProgress,
} from "@/lib/server/training";
import { TRAINING_STAFF_TYPE_LABELS } from "@/lib/constants/training";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { profile } = await requireUser();
  if (!canWriteContent(profile.role)) {
    return NextResponse.json({ error: "Managers only" }, { status: 403 });
  }
  const scope = req.nextUrl.searchParams.get("scope") ?? "team";
  const today = new Date().toISOString().slice(0, 10);

  if (scope === "course") {
    const rows = await getCourseReports();
    const csv = toCsv(
      [
        "course",
        "required",
        "assigned",
        "completed",
        "completion_percent",
        "pending_signoffs",
      ],
      rows.map((r) => [
        r.course.title,
        r.course.is_required ? "yes" : "no",
        r.assignedStaff,
        r.completedStaff,
        r.assignedStaff
          ? Math.round((r.completedStaff / r.assignedStaff) * 100)
          : 0,
        r.pendingSignoffs,
      ]),
    );
    return new NextResponse(csv, {
      headers: csvHeaders(`training-courses-${today}.csv`),
    });
  }

  const rows = await getTeamProgress();
  const csv = toCsv(
    [
      "name",
      "staff_type",
      "lessons_completed",
      "lessons_assigned",
      "completion_percent",
      "quizzes_passed",
      "quiz_attempts",
      "certs_expiring_30d",
    ],
    rows.map((r) => [
      r.staff.full_name,
      TRAINING_STAFF_TYPE_LABELS[r.staff.staff_type],
      r.completedLessons,
      r.totalLessons,
      r.totalLessons
        ? Math.round((r.completedLessons / r.totalLessons) * 100)
        : 0,
      r.quizPassedCount,
      r.quizAttempts,
      r.certificationsExpiringSoon,
    ]),
  );
  return new NextResponse(csv, {
    headers: csvHeaders(`training-team-${today}.csv`),
  });
}

function csvHeaders(filename: string) {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}

function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((row) =>
    row
      .map((cell) => {
        const s = String(cell ?? "");
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(","),
  );
  return lines.join("\n");
}

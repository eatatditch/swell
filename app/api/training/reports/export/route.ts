import { NextResponse, type NextRequest } from "next/server";

import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getCourseReports,
  getTeamProgress,
} from "@/lib/server/training";
import { ROLE_LABELS } from "@/lib/constants/roles";

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
        r.assignedUsers,
        r.completedUsers,
        r.assignedUsers
          ? Math.round((r.completedUsers / r.assignedUsers) * 100)
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
      "email",
      "role",
      "lessons_completed",
      "lessons_assigned",
      "completion_percent",
      "quizzes_passed",
      "quiz_attempts",
      "certs_expiring_30d",
    ],
    rows.map((r) => [
      r.user.full_name ?? "",
      r.user.email ?? "",
      ROLE_LABELS[r.user.role] ?? r.user.role,
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

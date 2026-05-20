import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, AlertTriangle, Users } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { AssignPathDialog } from "@/components/training/admin/assign-path-dialog";
import { PathEditor } from "@/components/training/admin/path-editor";
import { SignoffPanel } from "@/components/training/admin/signoff-panel";
import { CertificationFormDialog } from "@/components/training/certifications/certification-form-dialog";
import { CertificationList } from "@/components/training/certifications/certification-list";
import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getTeamProgress,
} from "@/lib/server/training";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLE_LABELS } from "@/lib/constants/roles";
import { cn } from "@/lib/utils";
import type {
  Certification,
  ProfileLite,
  Role,
  TrainingCourse,
  TrainingPath,
  TrainingPathCourse,
} from "@/lib/types/database";

function initials(name: string | null, email: string | null) {
  const s = (name ?? email ?? "·").trim();
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0, 2).toUpperCase();
}

export default async function TrainingProgressPage() {
  const { profile } = await requireUser();
  if (!canWriteContent(profile.role)) redirect("/training");

  const supabase = createSupabaseServerClient();
  const [rowsRes, pathsRes, coursesRes, staffRes, certsRes] = await Promise.all([
    getTeamProgress(),
    supabase
      .from("training_paths")
      .select(
        "*, path_courses:training_path_courses(*, course:training_courses(*))",
      )
      .order("name"),
    supabase
      .from("training_courses")
      .select("*")
      .eq("is_active", true)
      .order("title"),
    supabase
      .from("profiles")
      .select("id, full_name, email, avatar_url, role")
      .eq("is_active", true)
      .order("full_name"),
    supabase
      .from("certifications")
      .select(
        "*, user:profiles!certifications_user_id_fkey(id, full_name, email, avatar_url)",
      )
      .order("expires_on", { ascending: true, nullsFirst: false }),
  ]);

  const rows = rowsRes;
  const paths = (pathsRes.data ?? []) as (TrainingPath & {
    path_courses: (TrainingPathCourse & { course: TrainingCourse })[];
  })[];
  const courses = (coursesRes.data ?? []) as TrainingCourse[];
  const staff = (staffRes.data ?? []) as (ProfileLite & { role: Role })[];
  const certs = (certsRes.data ?? []) as (Certification & {
    user: ProfileLite | null;
  })[];

  const teamSize = rows.length;
  const fullyOnTrack = rows.filter(
    (r) => r.totalLessons > 0 && r.completedLessons === r.totalLessons,
  ).length;
  const flagged = rows.filter(
    (r) => r.certificationsExpiringSoon > 0,
  ).length;

  return (
    <>
      <PageHeader
        title="Team progress"
        description="Who's behind, who's on track, what's expiring."
        action={
          <Link
            href="/training"
            className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            Back to Surf School
          </Link>
        }
      />

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Team"
          value={String(teamSize)}
        />
        <Stat
          icon={Award}
          label="Fully on track"
          value={`${fullyOnTrack}/${teamSize}`}
        />
        <Stat
          icon={AlertTriangle}
          label="Expiring certs"
          value={String(flagged)}
          tone={flagged > 0 ? "warn" : "default"}
        />
        <Stat
          icon={Award}
          label="Active paths"
          value={String(paths.filter((p) => p.is_active).length)}
        />
      </section>

      <Tabs defaultValue="matrix" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="matrix">Progress</TabsTrigger>
          <TabsTrigger value="paths">Paths</TabsTrigger>
          <TabsTrigger value="certs">Certifications</TabsTrigger>
        </TabsList>

        <TabsContent value="matrix" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Progress matrix</CardTitle>
                <CardDescription>
                  Lessons assigned via paths vs. completed. Sign off on
                  in-person skills.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <SignoffPanel staff={staff} courses={courses} />
                <AssignPathDialog
                  staff={staff}
                  paths={paths.filter((p) => p.is_active)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No team members"
                  description="Invite people from /admin/users."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Person</th>
                        <th className="px-3 py-2 font-medium">Role</th>
                        <th className="px-3 py-2 text-right font-medium">
                          Lessons
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Quizzes
                        </th>
                        <th className="px-3 py-2 text-right font-medium">
                          Certs expiring
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r) => {
                        const pct =
                          r.totalLessons === 0
                            ? 0
                            : Math.round(
                                (r.completedLessons / r.totalLessons) * 100,
                              );
                        return (
                          <tr
                            key={r.user.id}
                            className="border-t border-border align-top"
                          >
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-7 w-7">
                                  {r.user.avatar_url ? (
                                    <AvatarImage
                                      src={r.user.avatar_url}
                                      alt=""
                                    />
                                  ) : null}
                                  <AvatarFallback className="text-[10px]">
                                    {initials(
                                      r.user.full_name,
                                      r.user.email,
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {r.user.full_name ??
                                      r.user.email ??
                                      "—"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {ROLE_LABELS[r.user.role]}
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              <div className="inline-flex flex-col items-end gap-1">
                                <span>
                                  {r.completedLessons}/{r.totalLessons}
                                </span>
                                <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full bg-accent"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums">
                              {r.quizPassedCount}
                              {r.quizAttempts > 0 ? (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  / {r.quizAttempts}
                                </span>
                              ) : null}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-2 text-right tabular-nums",
                                r.certificationsExpiringSoon > 0 &&
                                  "font-semibold text-rose-600",
                              )}
                            >
                              {r.certificationsExpiringSoon}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paths" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Training paths</CardTitle>
              <CardDescription>
                Sequences of courses you can assign to people. Add target roles
                so they auto-assign on hire.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PathEditor paths={paths} courses={courses} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-base">Certifications</CardTitle>
                <CardDescription>
                  Every credential and its expiration date.
                </CardDescription>
              </div>
              <CertificationFormDialog staff={staff} />
            </CardHeader>
            <CardContent>
              <TeamCertList certs={certs} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}

function TeamCertList({
  certs,
}: {
  certs: (Certification & { user: ProfileLite | null })[];
}) {
  if (certs.length === 0) {
    return (
      <EmptyState
        icon={Award}
        title="No certifications"
        description="Add the first one above."
      />
    );
  }
  // Group by user.
  const byUser = new Map<string, {
    user: ProfileLite;
    items: Certification[];
  }>();
  for (const c of certs) {
    if (!c.user) continue;
    const e = byUser.get(c.user.id) ?? { user: c.user, items: [] };
    e.items.push(c);
    byUser.set(c.user.id, e);
  }
  const groups = [...byUser.values()].sort((a, b) =>
    (a.user.full_name ?? a.user.email ?? "").localeCompare(
      b.user.full_name ?? b.user.email ?? "",
    ),
  );
  return (
    <div className="space-y-5">
      {groups.map((g) => (
        <div key={g.user.id}>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {g.user.full_name ?? g.user.email}
          </p>
          <CertificationList certifications={g.items} canManage />
        </div>
      ))}
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "default" | "warn";
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p
          className={
            tone === "warn"
              ? "text-3xl font-semibold tabular-nums text-rose-600"
              : "text-3xl font-semibold tabular-nums"
          }
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

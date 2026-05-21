import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  ClipboardCheck,
  GraduationCap,
  Users,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { AnnouncementBoard } from "@/components/training/announcement-board";
import { PalomaSearch } from "@/components/training/paloma-search";
import { requireUser } from "@/lib/auth/get-user";
import {
  canWriteContent,
  getActiveAnnouncements,
  getStaffTypeSummary,
  listAllTrainingStaff,
} from "@/lib/server/training";
import { TRAINING_STAFF_TYPE_LABELS } from "@/lib/constants/training";
import { ROLE_LABELS } from "@/lib/constants/roles";

export default async function TrainingHomePage() {
  const { profile } = await requireUser();
  const isManager = canWriteContent(profile.role);

  const [allStaff, typeSummary, announcements] = await Promise.all([
    listAllTrainingStaff(),
    getStaffTypeSummary(),
    getActiveAnnouncements(5),
  ]);

  const activeStaff = allStaff.filter((s) => s.is_active);

  return (
    <>
      <PageHeader
        title="Surf School"
        description={`Welcome, ${profile.full_name ?? "team"} · ${ROLE_LABELS[profile.role]}.`}
        action={
          <div className="flex gap-2">
            <Link
              href="/training/courses"
              className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
            >
              Course library
            </Link>
            {isManager ? (
              <Link
                href="/training/progress"
                className="inline-flex h-9 items-center rounded-full bg-accent px-4 text-sm font-semibold text-accent-foreground hover:bg-accent-soft"
              >
                Team progress
              </Link>
            ) : null}
          </div>
        }
      />

      <section className="mb-6">
        <PalomaSearch />
      </section>

      {announcements.length > 0 || isManager ? (
        <section className="mb-6">
          <AnnouncementBoard
            announcements={announcements}
            canManage={isManager}
          />
        </section>
      ) : null}

      <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          icon={Users}
          label="Active staff"
          value={String(activeStaff.length)}
        />
        {typeSummary.map((t) => (
          <Stat
            key={t.staffType}
            icon={GraduationCap}
            label={TRAINING_STAFF_TYPE_LABELS[t.staffType]}
            value={`${t.staffCount}`}
            sub={`${t.completionPct}% complete`}
          />
        ))}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NavCard
          href="/training/staff"
          icon={Users}
          title="Roster"
          description="Manage staff and kiosk PINs."
        />
        <NavCard
          href="/training/courses"
          icon={BookOpen}
          title="Course catalog"
          description="Browse and edit courses."
        />
        <NavCard
          href="/training/progress"
          icon={ClipboardCheck}
          title="Team progress"
          description="Who's on track, what's expiring."
        />
        <NavCard
          href="/training/reports"
          icon={BarChart3}
          title="Reports"
          description="Per-course completion."
        />
      </div>
    </>
  );
}

function NavCard({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Users;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/40"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display font-bold leading-snug group-hover:underline">
            {title}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: typeof Users;
  label: string;
  value: string;
  sub?: string;
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
        {sub ? (
          <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

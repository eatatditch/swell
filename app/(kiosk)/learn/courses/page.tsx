import Link from "next/link";
import { BookOpen, GraduationCap } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/data/empty-state";
import { requireKioskStaff } from "@/lib/server/training-staff";
import { getCategories, getCourseList } from "@/lib/server/training";
import { formatDuration } from "@/lib/constants/training";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function KioskCoursesPage() {
  const staff = await requireKioskStaff();

  const [categories, courses] = await Promise.all([
    getCategories(),
    getCourseList(staff.staff_type),
  ]);

  const grouped = new Map<string, typeof courses>();
  const uncategorized: typeof courses = [];
  for (const c of courses) {
    if (c.category_id) {
      const list = grouped.get(c.category_id) ?? [];
      list.push(c);
      grouped.set(c.category_id, list);
    } else {
      uncategorized.push(c);
    }
  }

  return (
    <>
      <PageHeader
        title="Course library"
        description="Every course we teach. Pick one, dig into lessons, take the quiz."
        action={
          <Link
            href="/learn"
            className="inline-flex h-9 items-center rounded-full border border-input bg-card px-4 text-sm font-semibold hover:bg-muted"
          >
            Back
          </Link>
        }
      />

      {courses.length === 0 ? (
        <Card>
          <CardContent className="py-10">
            <EmptyState
              icon={BookOpen}
              title="No courses for your role yet"
              description="Your manager hasn't set up any courses for your role. Check back soon."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => {
            const list = grouped.get(cat.id) ?? [];
            if (list.length === 0) return null;
            return (
              <section key={cat.id}>
                <div className="mb-3">
                  <h2 className="font-display text-lg font-bold">{cat.name}</h2>
                  {cat.description ? (
                    <p className="text-sm text-muted-foreground">
                      {cat.description}
                    </p>
                  ) : null}
                </div>
                <CourseGrid courses={list} />
              </section>
            );
          })}
          {uncategorized.length > 0 ? (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">
                Uncategorized
              </h2>
              <CourseGrid courses={uncategorized} />
            </section>
          ) : null}
        </div>
      )}
    </>
  );
}

function CourseGrid({
  courses,
}: {
  courses: Awaited<ReturnType<typeof getCourseList>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {courses.map((c) => (
        <Link
          key={c.id}
          href={`/learn/courses/${c.slug}`}
          className={cn(
            "group rounded-2xl border bg-card p-5 transition-colors hover:bg-muted/40",
            !c.is_active && "opacity-60",
          )}
        >
          <div className="flex items-start gap-3">
            <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display font-bold leading-snug group-hover:underline">
                {c.title}
              </p>
              {c.description ? (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                  {c.description}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                {c.lesson_count} lesson{c.lesson_count === 1 ? "" : "s"}
                {c.estimated_minutes
                  ? ` · ${formatDuration(c.estimated_minutes)}`
                  : ""}
                {c.is_required ? " · Required" : ""}
              </p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

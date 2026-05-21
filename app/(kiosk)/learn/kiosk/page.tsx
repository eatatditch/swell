import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { KioskSignInForm } from "@/components/kiosk/kiosk-sign-in-form";
import { getCurrentKioskStaff, listKioskRoster } from "@/lib/server/training-staff";

export const dynamic = "force-dynamic";

export default async function KioskSignInPage() {
  const staff = await getCurrentKioskStaff();
  if (staff) redirect("/learn");

  const roster = await listKioskRoster();

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <GraduationCap className="h-8 w-8" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold">Surf School</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in to take a lesson or quiz.
        </p>
      </div>
      <KioskSignInForm roster={roster} />
    </div>
  );
}

import Link from "next/link";
import { GraduationCap, LogOut } from "lucide-react";

import { getCurrentKioskStaff } from "@/lib/server/training-staff";
import { TRAINING_STAFF_TYPE_SHORT } from "@/lib/constants/training";
import { kioskSignOut } from "@/app/(kiosk)/learn/kiosk/actions";

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentKioskStaff();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-3">
          <Link
            href={staff ? "/learn" : "/learn/kiosk"}
            className="inline-flex items-center gap-2 font-display text-lg font-bold"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-accent">
              <GraduationCap className="h-5 w-5" />
            </span>
            Surf School
          </Link>
          {staff ? (
            <div className="flex items-center gap-3 text-sm">
              <span className="hidden sm:inline-block">
                <span className="font-medium">{staff.full_name}</span>{" "}
                <span className="text-muted-foreground">
                  · {TRAINING_STAFF_TYPE_SHORT[staff.staff_type]}
                </span>
              </span>
              <form action={kioskSignOut}>
                <button
                  type="submit"
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-input bg-background px-3 text-xs font-semibold hover:bg-muted"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign out
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl px-4 py-8">{children}</main>
    </div>
  );
}

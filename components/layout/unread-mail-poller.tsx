"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface UnreadMailPollerProps {
  initialCount: number;
  intervalMs?: number;
}

// Polls /api/me/unread-mail every N seconds. Triggers a router.refresh()
// when the count diverges from what the server rendered. This makes:
//   - Newly arrived inbound mail bump the sidebar badge immediately
//   - Marking a thread read clear the badge immediately, not on next nav
export function UnreadMailPoller({
  initialCount,
  intervalMs = 20_000,
}: UnreadMailPollerProps) {
  const router = useRouter();
  const lastCount = useRef(initialCount);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch("/api/me/unread-mail", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        const next = typeof data.count === "number" ? data.count : 0;
        if (next !== lastCount.current) {
          lastCount.current = next;
          router.refresh();
        }
      } catch {
        /* network blip, try again next tick */
      }
    }

    // Run once on mount so we close the gap between server render and now.
    void check();
    const id = setInterval(() => {
      if (!cancelled && document.visibilityState === "visible") void check();
    }, intervalMs);

    // Also re-check when the tab regains focus.
    function onVisible() {
      if (document.visibilityState === "visible") void check();
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}

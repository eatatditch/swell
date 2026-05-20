"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Bell, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/components/notifications/actions";
import { cn } from "@/lib/utils";
import type { Notification } from "@/lib/types/database";

interface NotificationListProps {
  notifications: Notification[];
  onItemClicked?: () => void;
}

function formatTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.round(hr / 24);
  return `${day}d`;
}

export function NotificationList({
  notifications,
  onItemClicked,
}: NotificationListProps) {
  const [pending, startTransition] = useTransition();
  const hasUnread = notifications.some((n) => !n.read_at);

  function read(n: Notification) {
    if (!n.read_at) {
      startTransition(async () => {
        await markNotificationRead(n.id);
      });
    }
    onItemClicked?.();
  }

  function readAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
        <Bell className="h-6 w-6" />
        <p>No notifications yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-3 py-2">
        <p className="text-sm font-semibold">Notifications</p>
        {hasUnread ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs"
            onClick={readAll}
            disabled={pending}
          >
            <Check className="h-3 w-3" />
            Mark all read
          </Button>
        ) : null}
      </div>
      <Separator />
      <ul className="max-h-96 overflow-y-auto">
        {notifications.map((n) => {
          const inner = (
            <div className="flex items-start gap-3 px-3 py-3 text-sm hover:bg-muted">
              <span
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  n.read_at ? "bg-transparent" : "bg-accent",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug">{n.title}</p>
                {n.body ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {n.body}
                  </p>
                ) : null}
                <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  {formatTime(n.created_at)} ago
                </p>
              </div>
            </div>
          );

          return (
            <li key={n.id}>
              {n.link ? (
                <Link href={n.link} onClick={() => read(n)} className="block">
                  {inner}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => read(n)}
                  className="block w-full text-left"
                >
                  {inner}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

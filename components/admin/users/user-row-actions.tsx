"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  deleteUserAction,
  resendInviteAction,
  toggleUserActiveAction,
} from "@/components/admin/users/actions";

interface UserRowActionsProps {
  userId: string;
  isActive: boolean;
  hasLoggedIn: boolean;
  isSelf: boolean;
  displayName: string;
}

export function UserRowActions({
  userId,
  isActive,
  hasLoggedIn,
  isSelf,
  displayName,
}: UserRowActionsProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function resend() {
    setOpen(false);
    startTransition(async () => {
      const res = await resendInviteAction(userId);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function toggleActive() {
    setOpen(false);
    startTransition(async () => {
      const res = await toggleUserActiveAction(userId, !isActive);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  function remove() {
    setOpen(false);
    const ok = confirm(
      `Permanently delete ${displayName}? This removes their sign-in and profile. This can't be undone.`,
    );
    if (!ok) return;
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if ("error" in res) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          aria-label="Actions"
          disabled={pending}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={`/admin/users/${userId}/edit`}>Edit profile</Link>
        </DropdownMenuItem>
        {!hasLoggedIn ? (
          <DropdownMenuItem onSelect={resend}>
            Resend invite email
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onSelect={toggleActive} disabled={isSelf}>
          {isActive ? "Mark inactive" : "Mark active"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={remove}
          disabled={isSelf}
          className="text-destructive focus:text-destructive"
        >
          Delete user
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

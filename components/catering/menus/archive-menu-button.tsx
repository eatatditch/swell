"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Archive, ArchiveRestore } from "lucide-react";

import { Button } from "@/components/ui/button";
import { setMenuArchived } from "@/components/catering/menus/actions";

export function ArchiveMenuButton({
  menuId,
  archived,
}: {
  menuId: string;
  archived: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      await setMenuArchived(menuId, !archived);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      className="gap-1.5"
    >
      {archived ? (
        <>
          <ArchiveRestore className="h-4 w-4" />
          Unarchive
        </>
      ) : (
        <>
          <Archive className="h-4 w-4" />
          Archive
        </>
      )}
    </Button>
  );
}

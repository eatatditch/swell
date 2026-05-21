"use client";

import { useState } from "react";
import { Menu, Waves } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import type { ModuleDef } from "@/lib/constants/modules";

export function MobileNav({ modules }: { modules: ModuleDef[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="w-64 bg-primary p-0 text-primary-foreground"
      >
        <SheetHeader className="flex h-16 flex-row items-center gap-2 border-b border-primary-foreground/10 px-5">
          <Waves className="h-5 w-5 text-accent" />
          <SheetTitle className="font-display text-xl font-black tracking-tight text-primary-foreground">
            SWELL
          </SheetTitle>
        </SheetHeader>
        <SidebarNav modules={modules} onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}

"use client";

import { Rocket } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { UserNav } from "@/components/layout/user-nav";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 md:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold mr-6">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Rocket className="h-4 w-4" />
          </div>
          <span>ShipFlow</span>
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <UserNav />
        </div>
      </div>
    </header>
  );
}

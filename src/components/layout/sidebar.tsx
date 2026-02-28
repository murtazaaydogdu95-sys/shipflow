"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FolderKanban, LayoutDashboard, Settings, BarChart3, Zap } from "lucide-react";

interface SidebarProps {
  projectId?: string;
}

export function Sidebar({ projectId }: SidebarProps) {
  const pathname = usePathname();

  const projectLinks = projectId
    ? [
        { href: `/projects/${projectId}`, label: "Board", icon: FolderKanban },
        { href: `/projects/${projectId}/sprints`, label: "Sprints", icon: Zap },
        { href: `/projects/${projectId}/analytics`, label: "Analytics", icon: BarChart3 },
        { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings },
      ]
    : [];

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-background">
      <nav className="flex-1 space-y-1 p-3">
        <Link
          href="/"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/" && "bg-accent font-medium"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Projects
        </Link>

        {projectLinks.length > 0 && (
          <>
            <div className="my-3 border-t" />
            {projectLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  pathname === link.href && "bg-accent font-medium"
                )}
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}

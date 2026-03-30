"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { FolderKanban, LayoutDashboard, Settings, BarChart3, Zap, Building2, Users, Activity, Shield, Crown, CalendarDays, Bot, Wallet, ShieldCheck, Target, RefreshCw, Inbox, Network } from "lucide-react";
import { useSoloMode } from "@/hooks/use-solo-mode";
import { useSession } from "next-auth/react";

export function Sidebar() {
  const pathname = usePathname();

  // Extract projectId from URL path if on a project page
  const projectMatch = pathname.match(/^\/projects\/([^/]+)/);
  const projectId = projectMatch?.[1];
  const { isPersonalOrg } = useSoloMode();
  const { data: session } = useSession();

  const projectLinks = projectId
    ? [
        { href: `/projects/${projectId}`, label: "Board", icon: FolderKanban, testId: "sidebar-board" },
        { href: `/projects/${projectId}/sprints`, label: "Sprints", icon: Zap, testId: "sidebar-sprints" },
        { href: `/projects/${projectId}/analytics`, label: "Analytics", icon: BarChart3, testId: "sidebar-analytics" },
        { href: `/projects/${projectId}/agents`, label: "Agents", icon: Bot, testId: "sidebar-agents" },
        { href: `/projects/${projectId}/routines`, label: "Routines", icon: RefreshCw, testId: "sidebar-routines" },
        { href: `/projects/${projectId}/settings`, label: "Settings", icon: Settings, testId: "sidebar-settings" },
      ]
    : [];

  return (
    <aside className="hidden md:flex w-56 flex-col border-r bg-background">
      <nav className="flex-1 space-y-1 p-3">
        <Link
          href="/dashboard"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/dashboard" && "bg-accent font-medium"
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Projects
        </Link>
        <Link
          href="/today"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/today" && "bg-accent font-medium"
          )}
        >
          <CalendarDays className="h-4 w-4" />
          Today
        </Link>
        <Link
          href="/inbox"
          data-testid="sidebar-inbox"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/inbox" && "bg-accent font-medium"
          )}
        >
          <Inbox className="h-4 w-4" />
          Inbox
        </Link>

        {projectLinks.length > 0 && (
          <>
            <div className="my-3 border-t" />
            {projectLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                data-testid={link.testId}
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

        {!isPersonalOrg && (
          <Link
            href="/activity"
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
              pathname === "/activity" && "bg-accent font-medium"
            )}
          >
            <Activity className="h-4 w-4" />
            Activity
          </Link>
        )}

        <div className="my-3 border-t" />
        <Link
          href="/org/settings"
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
            pathname === "/org/settings" && "bg-accent font-medium"
          )}
        >
          <Building2 className="h-4 w-4" />
          {isPersonalOrg ? "Settings" : "Org Settings"}
        </Link>
        {!isPersonalOrg && (
          <>
            <Link
              href="/org/members"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/members" && "bg-accent font-medium"
              )}
            >
              <Users className="h-4 w-4" />
              Members
            </Link>
            <Link
              href="/org/goals"
              data-testid="sidebar-goals"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/goals" && "bg-accent font-medium"
              )}
            >
              <Target className="h-4 w-4" />
              Goals
            </Link>
            <Link
              href="/org/budget"
              data-testid="sidebar-budget"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/budget" && "bg-accent font-medium"
              )}
            >
              <Wallet className="h-4 w-4" />
              Budget
            </Link>
            <Link
              href="/org/approvals"
              data-testid="sidebar-approvals"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/approvals" && "bg-accent font-medium"
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Approvals
            </Link>
            <Link
              href="/org/org-chart"
              data-testid="sidebar-org-chart"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/org-chart" && "bg-accent font-medium"
              )}
            >
              <Network className="h-4 w-4" />
              Org Chart
            </Link>
            <Link
              href="/org/audit-log"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/org/audit-log" && "bg-accent font-medium"
              )}
            >
              <Shield className="h-4 w-4" />
              Audit Log
            </Link>
          </>
        )}

        {session?.user?.isAdmin && (
          <>
            <div className="my-3 border-t" />
            <Link
              href="/admin"
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                pathname === "/admin" && "bg-accent font-medium"
              )}
            >
              <Crown className="h-4 w-4" />
              Admin
            </Link>
          </>
        )}
      </nav>
    </aside>
  );
}

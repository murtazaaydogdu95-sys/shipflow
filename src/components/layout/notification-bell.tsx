"use client";

import { useState, useRef, useEffect } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Bell, Check, ShieldCheck, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  href: string | null;
  createdAt: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;

  const { data, mutate } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 30000,
  });

  const { data: pendingApprovals } = useSWR(
    orgId ? `/api/orgs/${orgId}/approvals?status=pending` : null,
    fetcher,
    { refreshInterval: 60000 }
  );

  const { data: unreadData } = useSWR("/api/unread-count", fetcher, {
    refreshInterval: 30000,
  });

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;
  const pendingApprovalCount = Array.isArray(pendingApprovals) ? pendingApprovals.length : 0;
  const unreadTotal: number = unreadData?.total || 0;
  const totalBadgeCount = Math.max(unreadCount + pendingApprovalCount, unreadTotal);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function markAllRead() {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ all: true }),
    });
    mutate();
  }

  async function handleClick(n: NotificationItem) {
    if (!n.read) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [n.id] }),
      });
      mutate();
    }
    if (n.href) {
      router.push(n.href);
      setOpen(false);
    }
  }

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={() => setOpen(!open)}
      >
        <Bell className="h-4 w-4" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
            {totalBadgeCount > 9 ? "9+" : totalBadgeCount}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-lg border bg-popover shadow-lg z-50">
          <div className="flex items-center justify-between p-3 border-b">
            <span className="text-sm font-medium">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                <Check className="h-3 w-3" />
                Mark all read
              </button>
            )}
          </div>
          {pendingApprovalCount > 0 && (
            <button
              onClick={() => { router.push("/org/approvals"); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-accent/50 transition-colors border-b text-sm"
            >
              <ShieldCheck className="h-4 w-4 text-yellow-500 shrink-0" />
              <span className="flex-1">{pendingApprovalCount} pending approval{pendingApprovalCount !== 1 ? "s" : ""}</span>
            </button>
          )}
          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 && pendingApprovalCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No notifications
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 hover:bg-accent/50 transition-colors border-b last:border-0",
                    !n.read && "bg-accent/30"
                  )}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-muted-foreground mt-1">
                        {timeAgo(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
          <button
            data-testid="notification-inbox-link"
            onClick={() => { router.push("/inbox"); setOpen(false); }}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors border-t"
          >
            <Inbox className="h-3.5 w-3.5" />
            View inbox
          </button>
        </div>
      )}
    </div>
  );
}

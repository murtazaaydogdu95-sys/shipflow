"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Inbox,
  Bell,
  MessageSquare,
  ShieldCheck,
  Bot,
  CheckCheck,
  Loader2,
  AtSign,
} from "lucide-react";
import { toast } from "sonner";

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

type Tab = "all" | "unread" | "mentions" | "approvals" | "agent";

const TABS: { id: Tab; label: string; icon: typeof Bell }[] = [
  { id: "all", label: "All", icon: Inbox },
  { id: "unread", label: "Unread", icon: Bell },
  { id: "mentions", label: "Mentions", icon: AtSign },
  { id: "approvals", label: "Approvals", icon: ShieldCheck },
  { id: "agent", label: "Agent Updates", icon: Bot },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "mention":
    case "comment":
      return <MessageSquare className="h-4 w-4 text-blue-500" />;
    case "approval":
    case "approval_request":
      return <ShieldCheck className="h-4 w-4 text-yellow-500" />;
    case "agent_complete":
    case "agent_update":
    case "agent":
      return <Bot className="h-4 w-4 text-purple-500" />;
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />;
  }
}

function matchesTab(notification: NotificationItem, tab: Tab): boolean {
  if (tab === "all") return true;
  if (tab === "unread") return !notification.read;
  if (tab === "mentions")
    return notification.type === "mention" || notification.type === "comment";
  if (tab === "approvals")
    return (
      notification.type === "approval" ||
      notification.type === "approval_request"
    );
  if (tab === "agent")
    return (
      notification.type === "agent_complete" ||
      notification.type === "agent_update" ||
      notification.type === "agent"
    );
  return true;
}

export function InboxView() {
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);
  const router = useRouter();
  const pageSize = 20;

  const { data, mutate, isLoading } = useSWR(
    `/api/notifications?limit=${pageSize * page}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications: NotificationItem[] = data?.notifications || [];
  const unreadCount: number = data?.unreadCount || 0;

  const filtered = notifications.filter((n) => matchesTab(n, activeTab));
  const displayedItems = filtered.slice(0, pageSize * page);
  const hasMore = displayedItems.length < filtered.length;

  const handleMarkAllRead = useCallback(async () => {
    try {
      await fetch("/api/read-state/mark-all-read", { method: "POST" });
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      mutate();
      toast.success("All marked as read");
    } catch {
      toast.error("Failed to mark all as read");
    }
  }, [mutate]);

  const handleItemClick = useCallback(
    async (notification: NotificationItem) => {
      if (!notification.read) {
        await fetch("/api/notifications", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids: [notification.id] }),
        });
        mutate();
      }
      if (notification.href) {
        router.push(notification.href);
      }
    },
    [mutate, router]
  );

  return (
    <div data-testid="inbox-list">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Inbox className="h-6 w-6" />
            Inbox
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            data-testid="inbox-mark-all-read"
          >
            <CheckCheck className="mr-2 h-4 w-4" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b pb-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            data-testid={`inbox-tab-${tab.id}`}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
              activeTab === tab.id
                ? "bg-accent font-medium"
                : "text-muted-foreground hover:bg-accent/50"
            )}
          >
            <tab.icon className="h-3.5 w-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && displayedItems.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">You&apos;re all caught up</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {activeTab === "all"
              ? "No notifications to show."
              : `No ${activeTab} notifications.`}
          </p>
        </div>
      )}

      {displayedItems.length > 0 && (
        <div className="space-y-0.5 rounded-lg border overflow-hidden">
          {displayedItems.map((notification) => (
            <button
              key={notification.id}
              data-testid="inbox-item"
              onClick={() => handleItemClick(notification)}
              className={cn(
                "w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-accent/50 transition-colors border-b last:border-0",
                !notification.read && "bg-accent/20"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!notification.read && (
                    <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                  )}
                  <p
                    className={cn(
                      "text-sm truncate",
                      !notification.read && "font-medium"
                    )}
                  >
                    {notification.title}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {notification.message}
                </p>
              </div>
              <div className="shrink-0 flex flex-col items-end gap-1">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                  {timeAgo(notification.createdAt)}
                </span>
                <Badge variant="outline" className="text-[9px] capitalize">
                  {notification.type.replace(/_/g, " ")}
                </Badge>
              </div>
            </button>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

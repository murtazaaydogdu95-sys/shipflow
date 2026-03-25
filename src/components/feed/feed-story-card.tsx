"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Bot,
  Check,
  Eye,
  Globe,
  Loader2,
  Sparkles,
  Play,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StoryWithRelations } from "@/types";

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-400 text-white",
};

const typeColors: Record<string, string> = {
  feature: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  bug: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  chore: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  refactor: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  docs: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  test: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
};

const statusDotColors: Record<string, string> = {
  BACKLOG: "bg-gray-400",
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

interface FeedStoryCardProps {
  story: StoryWithRelations;
  projectId: string;
  onClick: () => void;
  onMoveToTodo?: () => void;
  onTriggerAgent?: () => void;
  onRewrite?: () => void;
}

export function FeedStoryCard({
  story,
  projectId,
  onClick,
  onMoveToTodo,
  onTriggerAgent,
  onRewrite,
}: FeedStoryCardProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const storyType = (story as StoryWithRelations & { type?: string }).type;

  function timeAgo(date: string | Date) {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return "just now";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }

  async function handleAction(action: string, handler?: () => void) {
    if (handler) {
      handler();
      return;
    }
    setActionLoading(action);
    try {
      if (action === "move-todo") {
        await fetch(`/api/projects/${projectId}/stories/${story.id}/move`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "TODO", position: 0 }),
        });
        onMoveToTodo?.();
      } else if (action === "build") {
        const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/trigger-agent`, {
          method: "POST",
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error(data.error || "Failed to trigger agent");
          return;
        }
        onTriggerAgent?.();
      }
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <Card
      className="px-4 py-3 cursor-pointer hover:border-primary/50 transition-all group"
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        {/* Status dot */}
        <div className={cn("h-2.5 w-2.5 rounded-full shrink-0", statusDotColors[story.status])} />

        {/* Short ID + Title */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono shrink-0">
              {story.shortId}
            </span>
            <span className="text-sm font-medium truncate">{story.title}</span>
          </div>
        </div>

        {/* Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {story.storyPoints && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
              {story.storyPoints} pts
            </Badge>
          )}
          <Badge className={cn("text-[10px] px-1 py-0 h-4", priorityColors[story.priority])}>
            {story.priority[0]}
          </Badge>
          {storyType && storyType !== "feature" && (
            <Badge className={cn("text-[10px] px-1 py-0 h-4", typeColors[storyType])}>
              {storyType}
            </Badge>
          )}

          {/* Agent status indicator */}
          {story.assignedToAgent && (
            <span className="inline-flex items-center gap-0.5">
              <Bot
                className={cn(
                  "h-3.5 w-3.5",
                  story.agentStatus === "RUNNING" && "text-blue-500 animate-pulse",
                  story.agentStatus === "QUEUED" && "text-yellow-500",
                  story.agentStatus === "COMPLETED" && "text-green-500",
                  story.agentStatus === "FAILED" && "text-red-500",
                  !story.agentStatus && "text-blue-500 animate-pulse"
                )}
              />
              {story.agentStatus && (
                <span
                  className={cn(
                    "text-[9px] font-medium",
                    story.agentStatus === "RUNNING" && "text-blue-500",
                    story.agentStatus === "QUEUED" && "text-yellow-500",
                    story.agentStatus === "COMPLETED" && "text-green-500",
                    story.agentStatus === "FAILED" && "text-red-500"
                  )}
                >
                  {story.agentStatus === "QUEUED" && "Queued"}
                  {story.agentStatus === "RUNNING" && "Working..."}
                  {story.agentStatus === "COMPLETED" && "Done"}
                  {story.agentStatus === "FAILED" && "Failed"}
                </span>
              )}
            </span>
          )}

          {story.labels.slice(0, 2).map(({ label }) => (
            <Badge
              key={label.id}
              variant="outline"
              className="text-[10px] px-1.5 py-0 h-5 hidden sm:inline-flex"
              style={{ borderColor: label.color, color: label.color }}
            >
              {label.name}
            </Badge>
          ))}

          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            {timeAgo(story.updatedAt)}
          </span>
        </div>

        {/* Quick actions */}
        <div
          className="flex items-center gap-1 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {story.status === "BACKLOG" && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleAction("rewrite", onRewrite)}
              >
                <Sparkles className="h-3 w-3" />
                Rewrite
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={actionLoading === "move-todo"}
                onClick={() => handleAction("move-todo")}
              >
                {actionLoading === "move-todo" ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <ArrowRight className="h-3 w-3" />
                )}
                To Do
              </Button>
            </>
          )}

          {story.status === "TODO" && (
            <Button
              size="sm"
              variant="default"
              className="h-7 text-xs gap-1"
              disabled={actionLoading === "build"}
              onClick={() => handleAction("build")}
            >
              {actionLoading === "build" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
              Build it
            </Button>
          )}

          {story.status === "REVIEW" && (
            <>
              <Button
                size="sm"
                variant="default"
                className="h-7 text-xs gap-1"
                onClick={onClick}
              >
                <Eye className="h-3 w-3" />
                Review
              </Button>
              {(story.previewPort || story.branchName) && (
                <a
                  href={`/api/preview/${story.shortId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                    <Globe className={`h-3 w-3 ${story.previewPort ? "text-green-500" : "text-muted-foreground"}`} />
                    Preview
                  </Button>
                </a>
              )}
            </>
          )}

          {story.status === "DONE" && (
            <Check className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
    </Card>
  );
}

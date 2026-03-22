"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { StoryWithRelations } from "@/types";
import { Bot, Globe, GripVertical, Trash2, Ban, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface StoryCardProps {
  story: StoryWithRelations;
  onClick?: () => void;
  onDelete?: (storyId: string) => void;
  isDragging?: boolean;
  isSelected?: boolean;
  isFocused?: boolean;
}

export function StoryCard({ story, onClick, onDelete, isDragging, isSelected, isFocused }: StoryCardProps) {
  const completedAC = story.acceptanceCriteria.filter((ac) => ac.completed).length;
  const totalAC = story.acceptanceCriteria.length;
  const storyType = (story as StoryWithRelations & { type?: string }).type;
  const blockerCount = story.blockedByDeps?.filter((d) => d.blocker.status !== "DONE").length ?? 0;
  const isBlocked = blockerCount > 0;
  const childCount = story.children?.length ?? 0;

  return (
    <Card
      data-testid={`story-card-${story.shortId}`}
      className={cn(
        "p-3 cursor-pointer hover:border-primary/50 transition-all group relative",
        isDragging && "opacity-50 rotate-2 shadow-lg",
        isSelected && "ring-2 ring-primary",
        isFocused && "ring-2 ring-primary/50 bg-accent/50",
        isBlocked && "border-red-500/30 bg-red-500/5"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        <div className="flex-1 min-w-0">
          {onDelete && (
            <button
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(story.id);
              }}
              title="Delete story"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs text-muted-foreground font-mono">{story.shortId}</span>
            <Badge className={cn("text-[10px] px-1 py-0 h-4", priorityColors[story.priority])}>
              {story.priority[0]}
            </Badge>
            {storyType && storyType !== "feature" && (
              <Badge className={cn("text-[10px] px-1 py-0 h-4", typeColors[storyType])}>
                {storyType}
              </Badge>
            )}
            {story.assignedToAgent && (
              <span className="inline-flex items-center gap-0.5">
                <Bot className={cn(
                  "h-3.5 w-3.5",
                  story.agentStatus === "RUNNING" && "text-blue-500 animate-pulse",
                  story.agentStatus === "QUEUED" && "text-yellow-500",
                  story.agentStatus === "COMPLETED" && story.status === "REVIEW" ? "text-purple-500" : "text-green-500",
                  story.agentStatus === "FAILED" && "text-red-500",
                  !story.agentStatus && "text-blue-500 animate-pulse"
                )} />
                {story.agentStatus && (
                  <span className={cn(
                    "text-[9px] font-medium",
                    story.agentStatus === "RUNNING" && "text-blue-500",
                    story.agentStatus === "QUEUED" && "text-yellow-500",
                    story.agentStatus === "COMPLETED" && story.status === "REVIEW" ? "text-purple-500" : "text-green-500",
                    story.agentStatus === "FAILED" && "text-red-500",
                  )}>
                    {story.agentStatus === "QUEUED" && "Queued"}
                    {story.agentStatus === "RUNNING" && "Working..."}
                    {story.agentStatus === "COMPLETED" && story.status === "REVIEW" && "Awaiting Review"}
                    {story.agentStatus === "COMPLETED" && story.status !== "REVIEW" && "Done"}
                    {story.agentStatus === "FAILED" && "Failed"}
                  </span>
                )}
              </span>
            )}
            {story.previewPort && story.status === "REVIEW" && (
              <span className="inline-flex items-center gap-0.5">
                <Globe className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                <span className="text-[9px] font-medium text-green-500">Preview Live</span>
              </span>
            )}
            {isBlocked && (
              <span className="inline-flex items-center gap-0.5" title={`Blocked by ${blockerCount} ${blockerCount === 1 ? "story" : "stories"}`}>
                <Ban className="h-3.5 w-3.5 text-red-500" />
                <span className="text-[9px] font-medium text-red-500">Blocked</span>
              </span>
            )}
            {childCount > 0 && (
              <span className="inline-flex items-center gap-0.5" title={`Epic with ${childCount} sub-stories`}>
                <Link2 className="h-3.5 w-3.5 text-indigo-500" />
                <span className="text-[9px] font-medium text-indigo-500">{childCount}</span>
              </span>
            )}
          </div>
          <p className="text-sm font-medium leading-tight line-clamp-2">{story.title}</p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {story.storyPoints && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {story.storyPoints} pts
              </Badge>
            )}
            {story.labels.slice(0, 2).map(({ label }) => (
              <Badge
                key={label.id}
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-5"
                style={{ borderColor: label.color, color: label.color }}
              >
                {label.name}
              </Badge>
            ))}
            {story.labels.length > 2 && (
              <span className="text-[10px] text-muted-foreground">+{story.labels.length - 2}</span>
            )}
            {story.assignee && (
              <div className="ml-auto" title={story.assignee.name || "Assigned"}>
                {story.assignee.image ? (
                  <img
                    src={story.assignee.image}
                    alt={story.assignee.name || ""}
                    className="h-5 w-5 rounded-full ring-1 ring-border"
                  />
                ) : (
                  <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium ring-1 ring-border">
                    {(story.assignee.name?.[0] || "?").toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          {totalAC > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${(completedAC / totalAC) * 100}%` }}
                />
              </div>
              <span className="text-[10px] text-muted-foreground">
                {completedAC}/{totalAC}
              </span>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

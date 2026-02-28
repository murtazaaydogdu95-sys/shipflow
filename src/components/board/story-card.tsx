"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { StoryWithRelations } from "@/types";
import { Bot, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-400 text-white",
};

interface StoryCardProps {
  story: StoryWithRelations;
  onClick?: () => void;
  isDragging?: boolean;
}

export function StoryCard({ story, onClick, isDragging }: StoryCardProps) {
  const completedAC = story.acceptanceCriteria.filter((ac) => ac.completed).length;
  const totalAC = story.acceptanceCriteria.length;

  return (
    <Card
      className={cn(
        "p-3 cursor-pointer hover:border-primary/50 transition-all group",
        isDragging && "opacity-50 rotate-2 shadow-lg"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-xs text-muted-foreground font-mono">{story.shortId}</span>
            <Badge className={cn("text-[10px] px-1 py-0 h-4", priorityColors[story.priority])}>
              {story.priority[0]}
            </Badge>
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

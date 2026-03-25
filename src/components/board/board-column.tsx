"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { SortableStory } from "./sortable-story";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { StoryWithRelations } from "@/types";
import { cn } from "@/lib/utils";

interface BoardColumnProps {
  id: string;
  title: string;
  stories: StoryWithRelations[];
  wipLimit?: number | null;
  totalCount?: number;
  onStoryClick: (story: StoryWithRelations) => void;
  onStoryDelete?: (storyId: string) => void;
}

const columnColors: Record<string, string> = {
  ICEBOX: "bg-slate-400",
  BACKLOG: "bg-gray-500",
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

export const BoardColumn = React.memo(function BoardColumn({ id, title, stories, wipLimit, totalCount, onStoryClick, onStoryDelete }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  // Use totalCount (unfiltered) for WIP limit checking, fall back to stories.length
  const count = totalCount ?? stories.length;
  const isAtLimit = wipLimit != null && count >= wipLimit;
  const isOverLimit = wipLimit != null && count > wipLimit;

  return (
    <div
      data-testid={`board-column-${id}`}
      className={cn(
        "flex flex-col w-72 min-w-[288px] bg-muted/30 rounded-xl",
        isOver && "ring-2 ring-primary/50",
        isOverLimit && "ring-2 ring-red-500/60",
        isAtLimit && !isOverLimit && "ring-2 ring-amber-500/60"
      )}
    >
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className={cn("h-2 w-2 rounded-full", columnColors[id])} />
        <h3 className="text-sm font-semibold">{title}</h3>
        {wipLimit != null ? (
          <Badge
            variant="secondary"
            className={cn(
              "ml-auto text-xs",
              isOverLimit && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
              isAtLimit && !isOverLimit && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
            )}
          >
            {count}/{wipLimit}
          </Badge>
        ) : (
          <Badge variant="secondary" className="ml-auto text-xs">
            {stories.length}
          </Badge>
        )}
        {totalPoints > 0 && (
          <Badge variant="outline" className="text-xs">
            {totalPoints} pts
          </Badge>
        )}
      </div>

      <ScrollArea className="flex-1 px-2 pb-2">
        <div ref={setNodeRef} className="space-y-2 min-h-[100px] p-1">
          <SortableContext items={stories.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {stories.map((story) => (
              <SortableStory
                key={story.id}
                story={story}
                onClick={() => onStoryClick(story)}
                onDelete={onStoryDelete}
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
});

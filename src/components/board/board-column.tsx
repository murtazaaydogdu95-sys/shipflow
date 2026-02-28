"use client";

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
  onStoryClick: (story: StoryWithRelations) => void;
}

const columnColors: Record<string, string> = {
  BACKLOG: "bg-gray-500",
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  REVIEW: "bg-purple-500",
  DONE: "bg-green-500",
};

export function BoardColumn({ id, title, stories, onStoryClick }: BoardColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const totalPoints = stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);

  return (
    <div
      className={cn(
        "flex flex-col w-72 min-w-[288px] bg-muted/30 rounded-xl",
        isOver && "ring-2 ring-primary/50"
      )}
    >
      <div className="flex items-center gap-2 p-3 pb-2">
        <div className={cn("h-2 w-2 rounded-full", columnColors[id])} />
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {stories.length}
        </Badge>
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
              />
            ))}
          </SortableContext>
        </div>
      </ScrollArea>
    </div>
  );
}

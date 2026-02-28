"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StoryCard } from "./story-card";
import type { StoryWithRelations } from "@/types";

interface SortableStoryProps {
  story: StoryWithRelations;
  onClick?: () => void;
  onDelete?: (storyId: string) => void;
}

export function SortableStory({ story, onClick, onDelete }: SortableStoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: story.id,
    data: { type: "story", story },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <StoryCard story={story} onClick={onClick} onDelete={onDelete} isDragging={isDragging} />
    </div>
  );
}

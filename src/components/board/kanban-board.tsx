"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardColumn } from "./board-column";
import { StoryCard } from "./story-card";
import { StoryDetailModal } from "@/components/stories/story-detail-modal";
import { useQuickCapture } from "@/components/providers/quick-capture-provider";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations, BoardColumn as BoardColumnType } from "@/types";
import { STORY_STATUSES, COLUMN_TITLES } from "@/types";

interface KanbanBoardProps {
  initialColumns: BoardColumnType[];
  projectId: string;
  labels: Array<{ id: string; name: string; color: string }>;
  techStack?: string | null;
}

export function KanbanBoard({ initialColumns, projectId, labels, techStack }: KanbanBoardProps) {
  const [columns, setColumns] = useState<BoardColumnType[]>(initialColumns);
  const [activeStory, setActiveStory] = useState<StoryWithRelations | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const [mounted, setMounted] = useState(false);
  const knownReviewIds = useRef<Set<string>>(new Set());
  const { openQuickCapture, onStoryCreated } = useQuickCapture();

  // Prevent DndContext hydration mismatch — only mount after client hydration
  useEffect(() => setMounted(true), []);

  // Poll for board updates (agent status changes, review notifications)
  useEffect(() => {
    // Track initial review stories
    const reviewCol = initialColumns.find((c) => c.id === "REVIEW");
    reviewCol?.stories.forEach((s) => knownReviewIds.current.add(s.id));

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/stories`);
        if (!res.ok) return;
        const stories: StoryWithRelations[] = await res.json();

        // Group by status
        const grouped: Record<string, StoryWithRelations[]> = {};
        for (const s of stories) {
          (grouped[s.status] ||= []).push(s);
        }

        // Check for new REVIEW stories — notify user
        const reviewStories = grouped["REVIEW"] || [];
        for (const s of reviewStories) {
          if (!knownReviewIds.current.has(s.id)) {
            knownReviewIds.current.add(s.id);
            toast.info(`${s.shortId} is ready for review: "${s.title}"`, {
              duration: 10000,
              action: {
                label: "Review",
                onClick: () => setSelectedStory(s),
              },
            });
          }
        }

        // Update columns
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            stories: (grouped[col.id] || []).sort((a, b) => a.position - b.position),
          }))
        );
      } catch {
        // ignore polling errors
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId, initialColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const findColumnByStoryId = useCallback(
    (storyId: string) => {
      return columns.find((col) => col.stories.some((s) => s.id === storyId));
    },
    [columns]
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const column = findColumnByStoryId(active.id as string);
    const story = column?.stories.find((s) => s.id === active.id);
    if (story) setActiveStory(story);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeCol = findColumnByStoryId(active.id as string);
    const overId = over.id as string;

    // Check if over a column directly
    const overCol = columns.find((col) => col.id === overId) || findColumnByStoryId(overId);

    if (!activeCol || !overCol || activeCol.id === overCol.id) return;

    setColumns((prev) => {
      const activeColIdx = prev.findIndex((c) => c.id === activeCol.id);
      const overColIdx = prev.findIndex((c) => c.id === overCol.id);

      const story = prev[activeColIdx].stories.find((s) => s.id === active.id);
      if (!story) return prev;

      const newColumns = [...prev];
      newColumns[activeColIdx] = {
        ...newColumns[activeColIdx],
        stories: newColumns[activeColIdx].stories.filter((s) => s.id !== active.id),
      };

      const overStoryIdx = newColumns[overColIdx].stories.findIndex((s) => s.id === overId);
      const insertIdx = overStoryIdx >= 0 ? overStoryIdx : newColumns[overColIdx].stories.length;

      newColumns[overColIdx] = {
        ...newColumns[overColIdx],
        stories: [
          ...newColumns[overColIdx].stories.slice(0, insertIdx),
          { ...story, status: overCol.id },
          ...newColumns[overColIdx].stories.slice(insertIdx),
        ],
      };

      return newColumns;
    });
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveStory(null);

    if (!over) return;

    const activeCol = findColumnByStoryId(active.id as string);
    if (!activeCol) return;

    const overId = over.id as string;
    const overIsColumn = columns.some((col) => col.id === overId);

    if (overIsColumn) {
      // Dropped on column directly - put at end
      const targetCol = columns.find((c) => c.id === overId)!;
      const position = targetCol.stories.findIndex((s) => s.id === active.id);
      await moveStory(active.id as string, overId, position >= 0 ? position : targetCol.stories.length);
    } else {
      // Dropped on another story - reorder within column
      const storyIdx = activeCol.stories.findIndex((s) => s.id === active.id);
      const overIdx = activeCol.stories.findIndex((s) => s.id === overId);

      if (storyIdx !== overIdx && storyIdx >= 0 && overIdx >= 0) {
        setColumns((prev) => {
          const colIdx = prev.findIndex((c) => c.id === activeCol.id);
          const newColumns = [...prev];
          newColumns[colIdx] = {
            ...newColumns[colIdx],
            stories: arrayMove(newColumns[colIdx].stories, storyIdx, overIdx),
          };
          return newColumns;
        });
      }

      await moveStory(active.id as string, activeCol.id, overIdx >= 0 ? overIdx : storyIdx);
    }
  };

  const moveStory = async (storyId: string, status: string, position: number) => {
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stories/${storyId}/move`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, position }),
        }
      );
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Failed to move story");
    }
  };

  const handleStoryDeleted = async (storyId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${storyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          stories: col.stories.filter((s) => s.id !== storyId),
        }))
      );
      toast.success("Story deleted");
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleStoryUpdated = (story: StoryWithRelations) => {
    setColumns((prev) =>
      prev.map((col) => ({
        ...col,
        stories: col.stories.map((s) => (s.id === story.id ? story : s)),
      }))
    );
  };

  // Register callback so new stories appear on the board immediately
  useEffect(() => {
    return onStoryCreated((story) => {
      setColumns((prev) =>
        prev.map((col) =>
          col.id === story.status
            ? { ...col, stories: [...col.stories, story] }
            : col
        )
      );
    });
  }, [onStoryCreated]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">Sprint Board</h2>
        </div>
        <Button size="sm" onClick={openQuickCapture}>
          <Plus className="mr-1 h-4 w-4" />
          Add Story
          <kbd className="ml-2 text-[10px] bg-primary-foreground/20 px-1 rounded hidden sm:inline">
            {"\u2318"}K
          </kbd>
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto">
        {mounted ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 p-4 min-w-max h-full">
              {STORY_STATUSES.map((status) => {
                const col = columns.find((c) => c.id === status) || {
                  id: status,
                  title: COLUMN_TITLES[status],
                  stories: [],
                };
                return (
                  <BoardColumn
                    key={status}
                    id={status}
                    title={COLUMN_TITLES[status]}
                    stories={col.stories}
                    onStoryClick={setSelectedStory}
                    onStoryDelete={handleStoryDeleted}
                  />
                );
              })}
            </div>

            <DragOverlay>
              {activeStory ? <StoryCard story={activeStory} isDragging /> : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <div className="flex gap-4 p-4 min-w-max h-full">
            {STORY_STATUSES.map((status) => {
              const col = columns.find((c) => c.id === status) || {
                id: status,
                title: COLUMN_TITLES[status],
                stories: [],
              };
              return (
                <div key={status} className="flex flex-col w-72 min-w-[288px] bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 p-3 pb-2">
                    <h3 className="text-sm font-semibold">{COLUMN_TITLES[status]}</h3>
                    <span className="ml-auto text-xs text-muted-foreground">{col.stories.length}</span>
                  </div>
                  <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px] p-1">
                    {col.stories.map((story) => (
                      <StoryCard key={story.id} story={story} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StoryDetailModal
        story={selectedStory}
        projectId={projectId}
        labels={labels}
        onClose={() => setSelectedStory(null)}
        onUpdated={handleStoryUpdated}
      />
    </div>
  );
}

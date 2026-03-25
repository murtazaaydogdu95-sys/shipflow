"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Eye, Lightbulb, Play, Clock, CheckCircle2, Snowflake } from "lucide-react";
import { toast } from "sonner";
import { PipelineSection } from "./pipeline-section";
import { FeedStoryCard } from "./feed-story-card";
import { StoryDetailModal } from "@/components/stories/story-detail-modal";
import { BoardFilters, type BoardFilterState } from "@/components/board/board-filters";
import { useQuickCapture } from "@/components/providers/quick-capture-provider";
import type { StoryWithRelations, BoardColumn as BoardColumnType, StoryStatus } from "@/types";
import { FEED_STATUS_ORDER, FEED_SECTION_TITLES, PRIORITIES } from "@/types";
import type { LucideIcon } from "lucide-react";

const sectionConfig: Record<string, { icon: LucideIcon; color: string }> = {
  ICEBOX: { icon: Snowflake, color: "bg-slate-400" },
  REVIEW: { icon: Eye, color: "bg-purple-500" },
  IN_PROGRESS: { icon: Clock, color: "bg-yellow-500" },
  TODO: { icon: Play, color: "bg-blue-500" },
  BACKLOG: { icon: Lightbulb, color: "bg-gray-400" },
  DONE: { icon: CheckCircle2, color: "bg-green-500" },
};

interface PipelineFeedProps {
  initialColumns: BoardColumnType[];
  projectId: string;
  labels: Array<{ id: string; name: string; color: string }>;
  members?: Array<{ id: string; name: string | null; image: string | null }>;
  techStack?: string | null;
  filters: BoardFilterState;
  onFiltersChange: (filters: BoardFilterState) => void;
}

export function PipelineFeed({
  initialColumns,
  projectId,
  labels,
  members = [],
  filters,
  onFiltersChange,
}: PipelineFeedProps) {
  const [stories, setStories] = useState<StoryWithRelations[]>(() =>
    initialColumns.flatMap((col) => col.stories)
  );
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const knownReviewIds = useRef<Set<string>>(new Set());
  const { openQuickCapture, onStoryCreated } = useQuickCapture();

  // Track initial review stories
  useEffect(() => {
    const reviewCol = initialColumns.find((c) => c.id === "REVIEW");
    reviewCol?.stories.forEach((s) => knownReviewIds.current.add(s.id));
  }, [initialColumns]);

  // Poll for story updates
  const consecutiveFailures = useRef(0);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}/stories`);
        if (!res.ok) {
          consecutiveFailures.current++;
          if (consecutiveFailures.current === 3) {
            toast.error("Feed sync is having trouble. Changes may be delayed.");
          }
          return;
        }
        consecutiveFailures.current = 0;
        const fetched: StoryWithRelations[] = await res.json();

        // Check for new REVIEW stories
        for (const s of fetched.filter((s) => s.status === "REVIEW")) {
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

        setStories(fetched);

        // Keep selected story in sync
        setSelectedStory((prev) => {
          if (!prev) return prev;
          return fetched.find((s) => s.id === prev.id) || prev;
        });
      } catch {
        consecutiveFailures.current++;
        if (consecutiveFailures.current === 3) {
          toast.error("Feed sync is having trouble. Changes may be delayed.");
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [projectId]);

  // Register for new stories from quick capture
  useEffect(() => {
    return onStoryCreated((story) => {
      setStories((prev) => [...prev, story]);
    });
  }, [onStoryCreated]);

  const handleStoryUpdated = (story: StoryWithRelations) => {
    setStories((prev) => prev.map((s) => (s.id === story.id ? story : s)));
    setSelectedStory((prev) => (prev?.id === story.id ? story : prev));
  };

  // Client-side filtering (same logic as KanbanBoard)
  const filterStories = useCallback(
    (items: StoryWithRelations[]) => {
      return items.filter((s) => {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (!s.title.toLowerCase().includes(q) && !s.shortId.toLowerCase().includes(q))
            return false;
        }
        if (filters.priorities.length > 0 && !filters.priorities.includes(s.priority))
          return false;
        if (filters.types.length > 0 && !filters.types.includes(s.type))
          return false;
        if (filters.labelIds.length > 0) {
          const storyLabelIds = s.labels?.map((l) => l.labelId) || [];
          if (!filters.labelIds.some((id) => storyLabelIds.includes(id)))
            return false;
        }
        if (filters.assigneeIds.length > 0) {
          if (!s.assigneeId || !filters.assigneeIds.includes(s.assigneeId))
            return false;
        }
        return true;
      });
    },
    [filters]
  );

  // Group and sort stories by feed order
  const groupedStories = FEED_STATUS_ORDER.map((status) => {
    const statusStories = stories.filter((s) => s.status === status);
    // Sort by priority (CRITICAL first), then by position
    const priorityOrder = PRIORITIES as readonly string[];
    statusStories.sort((a, b) => {
      const aPri = priorityOrder.indexOf(a.priority);
      const bPri = priorityOrder.indexOf(b.priority);
      if (aPri !== bPri) return aPri - bPri;
      return a.position - b.position;
    });
    return { status, stories: statusStories };
  });

  return (
    <div className="flex flex-col h-full">
      <BoardFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
        labels={labels}
        members={members}
      />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groupedStories.map(({ status, stories: sectionStories }) => {
          const filtered = filterStories(sectionStories);
          const totalPoints = filtered.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
          const config = sectionConfig[status];

          return (
            <PipelineSection
              key={status}
              label={FEED_SECTION_TITLES[status as StoryStatus]}
              icon={config.icon}
              color={config.color}
              count={filtered.length}
              totalPoints={totalPoints}
              defaultCollapsed={status === "DONE"}
            >
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground py-3 pl-6">
                  No stories
                </p>
              ) : (
                filtered.map((story) => (
                  <FeedStoryCard
                    key={story.id}
                    story={story}
                    projectId={projectId}
                    onClick={() => setSelectedStory(story)}
                    onRewrite={openQuickCapture}
                    onMoveToTodo={() => {
                      setStories((prev) =>
                        prev.map((s) =>
                          s.id === story.id ? { ...s, status: "TODO" } : s
                        )
                      );
                    }}
                    onTriggerAgent={() => {
                      setStories((prev) =>
                        prev.map((s) =>
                          s.id === story.id
                            ? { ...s, assignedToAgent: true, agentStatus: "QUEUED", status: "IN_PROGRESS" }
                            : s
                        )
                      );
                      toast.success(`Agent triggered for ${story.shortId}`);
                    }}
                  />
                ))
              )}
            </PipelineSection>
          );
        })}
      </div>

      <StoryDetailModal
        story={selectedStory}
        projectId={projectId}
        onClose={() => setSelectedStory(null)}
        onUpdated={handleStoryUpdated}
      />
    </div>
  );
}

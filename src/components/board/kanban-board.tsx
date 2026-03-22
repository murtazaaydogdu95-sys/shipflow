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
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Snowflake, CheckSquare, X } from "lucide-react";

import type { StoryWithRelations, BoardColumn as BoardColumnType, StoryStatus } from "@/types";
import { STORY_STATUSES, ALL_STORY_STATUSES, COLUMN_TITLES } from "@/types";
import { BoardFilters, EMPTY_FILTERS, type BoardFilterState } from "./board-filters";
import { KeyboardShortcutHelpDialog } from "./keyboard-shortcut-help-dialog";

interface KanbanBoardProps {
  initialColumns: BoardColumnType[];
  projectId: string;
  projectName: string;
  labels: Array<{ id: string; name: string; color: string }>;
  members?: Array<{ id: string; name: string | null; image: string | null }>;
  techStack?: string | null;
  filters?: BoardFilterState;
  onFiltersChange?: (filters: BoardFilterState) => void;
  onFocusStory?: (storyId: string) => void;
}

export function KanbanBoard({ initialColumns, projectId, labels, members = [], filters: externalFilters, onFiltersChange: externalOnFiltersChange, onFocusStory }: KanbanBoardProps) {
  const [columns, setColumns] = useState<BoardColumnType[]>(initialColumns);
  const [internalFilters, setInternalFilters] = useState<BoardFilterState>(EMPTY_FILTERS);
  const filters = externalFilters ?? internalFilters;
  const setFilters = externalOnFiltersChange ?? setInternalFilters;
  const [activeStory, setActiveStory] = useState<StoryWithRelations | null>(null);
  const [selectedStory, setSelectedStory] = useState<StoryWithRelations | null>(null);
  const [mounted, setMounted] = useState(false);
  const knownReviewIds = useRef<Set<string>>(new Set());
  const { onStoryCreated } = useQuickCapture();

  // ICEBOX column toggle
  const [showIcebox, setShowIcebox] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  // Keyboard navigation
  const [focusedCol, setFocusedCol] = useState(0);
  const [focusedRow, setFocusedRow] = useState(0);

  const visibleStatuses = showIcebox ? ALL_STORY_STATUSES : STORY_STATUSES;

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

        // Keep selected story in sync with latest data
        setSelectedStory((prev) => {
          if (!prev) return prev;
          const updated = stories.find((s) => s.id === prev.id);
          return updated || prev;
        });
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
    // Keep selected story in sync
    setSelectedStory((prev) => (prev?.id === story.id ? story : prev));
  };

  // Bulk update handler
  async function handleBulkUpdate(update: Record<string, string | null>) {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyIds: Array.from(selectedIds), update }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Updated ${selectedIds.size} stories`);
      setSelectedIds(new Set());
      setBulkMode(false);
      // Refresh will happen via polling
    } catch {
      toast.error("Bulk update failed");
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} stories? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/bulk`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storyIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error();
      setColumns((prev) =>
        prev.map((col) => ({
          ...col,
          stories: col.stories.filter((s) => !selectedIds.has(s.id)),
        }))
      );
      toast.success(`Deleted ${selectedIds.size} stories`);
      setSelectedIds(new Set());
      setBulkMode(false);
    } catch {
      toast.error("Bulk delete failed");
    }
  }

  function handleExport(format: "csv" | "json") {
    window.open(`/api/projects/${projectId}/stories/export?format=${format}`, "_blank");
  }

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

  // Apply client-side filters
  const filterStories = useCallback(
    (stories: StoryWithRelations[]) => {
      return stories.filter((s) => {
        if (filters.search) {
          const q = filters.search.toLowerCase();
          if (
            !s.title.toLowerCase().includes(q) &&
            !s.shortId.toLowerCase().includes(q)
          )
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

  // Keyboard shortcuts (must be after filterStories is declared)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

      const cols = visibleStatuses.map((status) =>
        filterStories((columns.find((c) => c.id === status)?.stories ?? []))
      );

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          setFocusedCol((prev) => Math.min(prev + 1, visibleStatuses.length - 1));
          setFocusedRow(0);
          break;
        case "ArrowLeft":
          e.preventDefault();
          setFocusedCol((prev) => Math.max(prev - 1, 0));
          setFocusedRow(0);
          break;
        case "ArrowDown":
          e.preventDefault();
          setFocusedRow((prev) => {
            const maxRow = (cols[focusedCol]?.length ?? 1) - 1;
            return Math.min(prev + 1, maxRow);
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedRow((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter": {
          const story = cols[focusedCol]?.[focusedRow];
          if (story) setSelectedStory(story);
          break;
        }
        case " ": {
          if (!bulkMode) break;
          e.preventDefault();
          const story = cols[focusedCol]?.[focusedRow];
          if (story) {
            setSelectedIds((prev) => {
              const next = new Set(prev);
              if (next.has(story.id)) next.delete(story.id);
              else next.add(story.id);
              return next;
            });
          }
          break;
        }
        case "f":
          if (!e.metaKey && !e.ctrlKey && onFocusStory) {
            const story = cols[focusedCol]?.[focusedRow];
            if (story) onFocusStory(story.id);
          }
          break;
        case "b":
          if (!e.metaKey && !e.ctrlKey) {
            setBulkMode((prev) => {
              if (prev) setSelectedIds(new Set());
              return !prev;
            });
          }
          break;
        case "Escape":
          if (bulkMode) {
            setBulkMode(false);
            setSelectedIds(new Set());
          }
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [columns, focusedCol, focusedRow, bulkMode, visibleStatuses, filterStories]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex-1">
          <BoardFilters
            filters={filters}
            onFiltersChange={setFilters}
            labels={labels}
            members={members}
          />
        </div>
        <div className="flex items-center gap-1.5 px-4 py-1 shrink-0">
          <Button
            variant={showIcebox ? "default" : "ghost"}
            size="sm"
            onClick={() => setShowIcebox(!showIcebox)}
            title="Toggle Someday/Icebox column"
            className="h-7 text-xs gap-1"
            data-testid="board-icebox-toggle"
          >
            <Snowflake className="h-3.5 w-3.5" />
            Someday
          </Button>
          <Button
            variant={bulkMode ? "default" : "ghost"}
            size="sm"
            onClick={() => { setBulkMode(!bulkMode); if (bulkMode) setSelectedIds(new Set()); }}
            title="Toggle bulk selection (B)"
            className="h-7 text-xs gap-1"
            data-testid="board-bulk-toggle"
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Bulk
          </Button>
          <Select onValueChange={(v) => handleExport(v as "csv" | "json")}>
            <SelectTrigger className="h-7 w-auto gap-1 text-xs border-0 shadow-none" data-testid="board-export-btn">
              <Download className="h-3.5 w-3.5" />
              Export
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk actions bar */}
      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border-b">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Select onValueChange={(v) => handleBulkUpdate({ status: v })}>
            <SelectTrigger className="h-7 w-auto text-xs"><SelectValue placeholder="Move to..." /></SelectTrigger>
            <SelectContent>
              {ALL_STORY_STATUSES.map((s) => <SelectItem key={s} value={s}>{COLUMN_TITLES[s as StoryStatus]}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => handleBulkUpdate({ priority: v })}>
            <SelectTrigger className="h-7 w-auto text-xs"><SelectValue placeholder="Priority..." /></SelectTrigger>
            <SelectContent>
              {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="destructive" size="sm" className="h-7 text-xs ml-auto" onClick={handleBulkDelete}>
            Delete
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

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
              {visibleStatuses.map((status, colIdx) => {
                const col = columns.find((c) => c.id === status) || {
                  id: status,
                  title: COLUMN_TITLES[status as StoryStatus],
                  stories: [],
                };
                const filtered = filterStories(col.stories);
                return (
                  <BoardColumn
                    key={status}
                    id={status}
                    title={COLUMN_TITLES[status as StoryStatus]}
                    stories={filtered.map((s, rowIdx) => ({
                      ...s,
                      _isSelected: selectedIds.has(s.id),
                      _isFocused: colIdx === focusedCol && rowIdx === focusedRow,
                    }))}
                    onStoryClick={(story) => {
                      if (bulkMode) {
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(story.id)) next.delete(story.id);
                          else next.add(story.id);
                          return next;
                        });
                      } else {
                        setSelectedStory(story);
                      }
                    }}
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
            {visibleStatuses.map((status) => {
              const col = columns.find((c) => c.id === status) || {
                id: status,
                title: COLUMN_TITLES[status as StoryStatus],
                stories: [],
              };
              const filtered = filterStories(col.stories);
              return (
                <div key={status} className="flex flex-col w-64 sm:w-72 min-w-[256px] sm:min-w-[288px] bg-muted/30 rounded-xl">
                  <div className="flex items-center gap-2 p-3 pb-2">
                    <h3 className="text-sm font-semibold">{COLUMN_TITLES[status as StoryStatus]}</h3>
                    <span className="ml-auto text-xs text-muted-foreground">{filtered.length}</span>
                  </div>
                  <div className="flex-1 px-2 pb-2 space-y-2 min-h-[100px] p-1">
                    {filtered.map((story) => (
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

      <KeyboardShortcutHelpDialog />
    </div>
  );
}

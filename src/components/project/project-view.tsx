"use client";

import { useState, useRef, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Check, X, List, Columns3, Focus, Coffee } from "lucide-react";
import { toast } from "sonner";
import { useQuickCapture } from "@/components/providers/quick-capture-provider";
import { KanbanBoard } from "@/components/board/kanban-board";
import { PipelineFeed } from "@/components/feed/pipeline-feed";
import { FocusMode } from "@/components/board/focus-mode";
import { StandupDialog } from "@/components/project/standup-dialog";
import { EMPTY_FILTERS, type BoardFilterState } from "@/components/board/board-filters";
import { KeyboardShortcutHelpDialog } from "@/components/board/keyboard-shortcut-help-dialog";
import type { BoardColumn as BoardColumnType } from "@/types";

type ViewMode = "feed" | "board";

const STORAGE_KEY = "codepylot-view-preference";

// Always start with "feed" on both server and client to avoid hydration mismatch.
// The stored preference is applied in a useEffect after mount.
function getInitialView(): ViewMode {
  return "feed";
}

interface ProjectViewProps {
  initialColumns: BoardColumnType[];
  projectId: string;
  projectName: string;
  labels: Array<{ id: string; name: string; color: string }>;
  members?: Array<{ id: string; name: string | null; image: string | null }>;
  sprints?: Array<{ id: string; name: string; status: string }>;
  techStack?: string | null;
}

export function ProjectView({
  initialColumns,
  projectId,
  projectName,
  labels,
  members = [],
  sprints = [],
  techStack,
}: ProjectViewProps) {
  const [view, setView] = useState<ViewMode>(getInitialView);
  const [filters, setFilters] = useState<BoardFilterState>(EMPTY_FILTERS);
  const { openQuickCapture } = useQuickCapture();
  const [focusMode, setFocusMode] = useState(false);
  const [focusedStoryId, setFocusedStoryId] = useState<string | null>(null);
  const [standupOpen, setStandupOpen] = useState(false);

  // Restore saved view preference after hydration (avoids SSR mismatch)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "board") setView("board");
  }, []);

  // Flatten all stories for focus mode navigation
  const allStories = initialColumns.flatMap((col) => col.stories);

  // Title editing state
  const [boardTitle, setBoardTitle] = useState(projectName);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editingTitle, setEditingTitle] = useState(projectName);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  function handleViewChange(v: string) {
    const mode = v as ViewMode;
    setView(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  }

  async function handleTitleSave() {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === boardTitle) {
      setIsEditingTitle(false);
      setEditingTitle(boardTitle);
      return;
    }
    setIsSavingTitle(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) throw new Error();
      setBoardTitle(trimmed);
      setIsEditingTitle(false);
      toast.success("Project title updated");
    } catch {
      toast.error("Failed to update title");
      setEditingTitle(boardTitle);
    } finally {
      setIsSavingTitle(false);
    }
  }

  function handleTitleCancel() {
    setEditingTitle(boardTitle);
    setIsEditingTitle(false);
  }

  function handleTitleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleTitleSave();
    if (e.key === "Escape") handleTitleCancel();
  }

  // Focus mode rendering
  if (focusMode && focusedStoryId) {
    const focusedStory = allStories.find((s) => s.id === focusedStoryId);
    if (focusedStory) {
      return (
        <FocusMode
          story={focusedStory}
          projectId={projectId}
          allStories={allStories}
          onExit={() => { setFocusMode(false); setFocusedStoryId(null); }}
          onNavigate={(id) => setFocusedStoryId(id)}
        />
      );
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-3">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <Input
                ref={titleInputRef}
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                onBlur={handleTitleSave}
                maxLength={100}
                disabled={isSavingTitle}
                className="h-8 text-lg font-semibold w-64"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={handleTitleSave}
                disabled={isSavingTitle}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleTitleCancel}
                disabled={isSavingTitle}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h2 className="text-lg font-semibold">{boardTitle}</h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <Tabs value={view} onValueChange={handleViewChange}>
            <TabsList className="h-8">
              <TabsTrigger value="feed" className="text-xs gap-1 px-2.5 h-6">
                <List className="h-3.5 w-3.5" />
                Feed
              </TabsTrigger>
              <TabsTrigger value="board" className="text-xs gap-1 px-2.5 h-6">
                <Columns3 className="h-3.5 w-3.5" />
                Board
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setStandupOpen(true)}
          >
            <Coffee className="mr-1 h-4 w-4" />
            Standup
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (allStories.length > 0) {
                setFocusedStoryId(allStories[0].id);
                setFocusMode(true);
              }
            }}
          >
            <Focus className="mr-1 h-4 w-4" />
            Focus
          </Button>
          <Button size="sm" onClick={openQuickCapture}>
            <Plus className="mr-1 h-4 w-4" />
            Add Story
            <kbd className="ml-2 text-[10px] bg-primary-foreground/20 px-1 rounded hidden sm:inline">
              {"\u2318"}K
            </kbd>
          </Button>
        </div>
      </div>

      {/* View content */}
      {view === "feed" ? (
        <PipelineFeed
          initialColumns={initialColumns}
          projectId={projectId}
          labels={labels}
          members={members}
          sprints={sprints}
          techStack={techStack}
          filters={filters}
          onFiltersChange={setFilters}
        />
      ) : (
        <KanbanBoard
          initialColumns={initialColumns}
          projectId={projectId}
          projectName={boardTitle}
          labels={labels}
          members={members}
          sprints={sprints}
          techStack={techStack}
          filters={filters}
          onFiltersChange={setFilters}
          onFocusStory={(storyId) => { setFocusedStoryId(storyId); setFocusMode(true); }}
        />
      )}

      <StandupDialog
        open={standupOpen}
        onOpenChange={setStandupOpen}
        projectId={projectId}
      />

      <KeyboardShortcutHelpDialog />
    </div>
  );
}

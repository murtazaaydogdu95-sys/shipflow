"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft, ChevronRight, X, Bot, Globe, GitBranch } from "lucide-react";
import { DiffViewer } from "@/components/stories/diff-viewer";
import { AIReview } from "@/components/stories/ai-review";
import type { StoryWithRelations } from "@/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface FocusModeProps {
  story: StoryWithRelations;
  projectId: string;
  allStories: StoryWithRelations[];
  onExit: () => void;
  onNavigate: (storyId: string) => void;
}

export function FocusMode({
  story,
  projectId,
  allStories,
  onExit,
  onNavigate,
}: FocusModeProps) {
  const currentIndex = allStories.findIndex((s) => s.id === story.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allStories.length - 1;

  const { data: diffData } = useSWR(
    story.branchName ? `/api/projects/${projectId}/stories/${story.id}/diff` : null,
    fetcher
  );

  const { data: agentLogs } = useSWR(
    story.assignedToAgent ? `/api/projects/${projectId}/stories/${story.id}/logs` : null,
    fetcher,
    { refreshInterval: story.agentStatus === "RUNNING" ? 5000 : 0 }
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "Escape") onExit();
      if (e.key === "ArrowLeft" && hasPrev) onNavigate(allStories[currentIndex - 1].id);
      if (e.key === "ArrowRight" && hasNext) onNavigate(allStories[currentIndex + 1].id);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onExit, onNavigate, hasPrev, hasNext, currentIndex, allStories]);

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <X className="h-4 w-4 mr-1" />
          Exit Focus
        </Button>
        <Separator orientation="vertical" className="h-5" />
        <Badge variant="outline" className="font-mono">{story.shortId}</Badge>
        <h3 className="text-sm font-medium truncate flex-1">{story.title}</h3>
        <span className="text-xs text-muted-foreground">
          {currentIndex + 1} / {allStories.length}
        </span>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Details */}
        <div className="w-72 shrink-0 border-r overflow-y-auto p-4 space-y-4">
          <div>
            <h4 className="text-sm font-semibold">{story.title}</h4>
            <div className="flex gap-1.5 mt-2">
              <Badge className={
                story.status === "DONE" ? "bg-green-500" :
                story.status === "IN_PROGRESS" ? "bg-yellow-500" :
                story.status === "REVIEW" ? "bg-purple-500" : "bg-blue-500"
              }>
                {story.status.replace("_", " ")}
              </Badge>
              <Badge variant="outline">{story.priority}</Badge>
              <Badge variant="secondary">{story.type}</Badge>
            </div>
          </div>

          {story.userStory && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">User Story</label>
              <p className="text-sm mt-1 italic">{story.userStory}</p>
            </div>
          )}

          {story.description && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Description</label>
              <p className="text-sm mt-1">{story.description}</p>
            </div>
          )}

          {story.acceptanceCriteria.length > 0 && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Acceptance Criteria</label>
              <div className="mt-1 space-y-1.5">
                {story.acceptanceCriteria.map((ac) => (
                  <div key={ac.id} className="text-xs rounded border p-2">
                    <span className="text-muted-foreground">Given</span> {ac.given}{" "}
                    <span className="text-muted-foreground">When</span> {ac.when}{" "}
                    <span className="text-muted-foreground">Then</span> {ac.then}
                  </div>
                ))}
              </div>
            </div>
          )}

          {story.storyPoints && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Points:</span>
              <Badge variant="outline">{story.storyPoints}</Badge>
            </div>
          )}

          {story.branchName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <GitBranch className="h-3.5 w-3.5" />
              <span className="font-mono truncate">{story.branchName}</span>
            </div>
          )}
        </div>

        {/* Center panel: Diff or Description */}
        <div className="flex-1 overflow-y-auto p-4">
          {story.branchName ? (
            <div className="space-y-4">
              <AIReview projectId={projectId} storyId={story.id} />
              <Separator />
              {diffData?.diff ? (
                <DiffViewer rawDiff={diffData.diff} />
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {diffData?.error || "Loading diff..."}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No diff available. Story has no branch yet.</p>
            </div>
          )}
        </div>

        {/* Right panel: Agent Logs + Preview */}
        <div className="w-80 shrink-0 border-l overflow-y-auto p-4 space-y-4">
          {story.assignedToAgent && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bot className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Agent</span>
                {story.agentStatus === "RUNNING" && (
                  <Badge variant="secondary" className="text-[10px] animate-pulse">Live</Badge>
                )}
                {story.agentStatus && story.agentStatus !== "RUNNING" && (
                  <Badge variant="outline" className="text-[10px]">{story.agentStatus}</Badge>
                )}
              </div>
              <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-auto max-h-[300px] whitespace-pre-wrap font-mono">
                {agentLogs?.log || "No logs available."}
              </pre>
            </div>
          )}

          {story.previewPort && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Globe className="h-4 w-4 text-green-500 animate-pulse" />
                <span className="text-sm font-medium">Preview</span>
              </div>
              <iframe
                src={`/api/preview/${story.shortId}`}
                className="w-full h-64 border rounded-lg"
                title="Story Preview"
              />
            </div>
          )}

          {!story.assignedToAgent && !story.previewPort && (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p className="text-sm">No agent activity or preview.</p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom navigation bar */}
      <div className="flex items-center justify-between px-4 py-2 border-t bg-background">
        <Button
          variant="outline"
          size="sm"
          disabled={!hasPrev}
          onClick={() => hasPrev && onNavigate(allStories[currentIndex - 1].id)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          Press Escape to exit, Arrow keys to navigate
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={!hasNext}
          onClick={() => hasNext && onNavigate(allStories[currentIndex + 1].id)}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

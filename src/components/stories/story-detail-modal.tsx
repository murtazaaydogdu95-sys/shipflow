"use client";

import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Bot, Check, Save, Loader2, Trash2, ThumbsUp, ThumbsDown, Send, GitBranch, Globe } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations } from "@/types";
import { STORY_TYPES } from "@/types";
import { cn } from "@/lib/utils";

interface StoryDetailModalProps {
  story: StoryWithRelations | null;
  projectId: string;
  labels: Array<{ id: string; name: string; color: string }>;
  onClose: () => void;
  onUpdated: (story: StoryWithRelations) => void;
}

export function StoryDetailModal({
  story,
  projectId,
  labels,
  onClose,
  onUpdated,
}: StoryDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editPoints, setEditPoints] = useState<string>("");
  const [editType, setEditType] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  const isOpen = !!story;

  // Sync state when story changes
  if (story && editTitle === "" && story.title !== editTitle) {
    setEditTitle(story.title);
    setEditDescription(story.description || "");
    setEditPriority(story.priority);
    setEditType((story as StoryWithRelations & { type?: string }).type || "feature");
    setEditPoints(story.storyPoints ? String(story.storyPoints) : "");
  }

  async function handleSave() {
    if (!story) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priority: editPriority,
          type: editType,
          storyPoints: editPoints ? Number(editPoints) : null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
      toast.success("Story updated");
    } catch {
      toast.error("Failed to update story");
    } finally {
      setSaving(false);
    }
  }

  function generateClaudePrompt() {
    if (!story) return "";
    const acList = story.acceptanceCriteria
      .map((ac, i) => `${i + 1}. Given ${ac.given}, when ${ac.when}, then ${ac.then}`)
      .join("\n");

    return `## Task: ${story.title}

### User Story
${story.userStory || story.description || "No description"}

### Acceptance Criteria
${acList || "No acceptance criteria defined."}

### Priority: ${story.priority}
### Story Points: ${story.storyPoints ?? "Unestimated"}

### Instructions
Implement this user story. Follow existing code patterns and conventions.
When complete, commit with message: "feat: ${story.title} [${story.shortId}]"`;
  }

  async function handleApprove() {
    if (!story) return;
    setReviewLoading(true);
    try {
      // Stop preview if running
      if (story.previewPort) {
        await fetch(`/api/projects/${projectId}/stories/${story.id}/preview`, {
          method: "DELETE",
        });
      }

      // Move to DONE and clear preview fields
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "DONE",
          previewPort: null,
          previewPid: null,
        }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      onUpdated(updated);
      toast.success("Story approved and moved to Done!");

      // Git push — with branch merge if applicable
      const pushRes = await fetch(`/api/projects/${projectId}/git-push`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shortId: story.shortId,
          title: story.title,
          branchName: story.branchName,
        }),
      });
      if (pushRes.ok) {
        const data = await pushRes.json();
        if (data.merged) {
          toast.success(`Merged ${data.merged} to main and pushed`);
        } else {
          toast.success(`Pushed to origin/${data.branch}`);
        }
      } else {
        const { error } = await pushRes.json().catch(() => ({ error: "Push failed" }));
        toast.error(`Git push failed: ${error}`);
      }
    } catch {
      toast.error("Failed to approve story");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleReject() {
    if (!story || !rejectFeedback.trim()) {
      toast.error("Please provide feedback on what needs to be fixed");
      return;
    }
    setReviewLoading(true);
    try {
      // Stop preview if running
      if (story.previewPort) {
        await fetch(`/api/projects/${projectId}/stories/${story.id}/preview`, {
          method: "DELETE",
        });
      }

      // Move back to TODO, clear agentStatus + preview fields, keep branchName
      await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "TODO",
          agentStatus: null,
          agentNotes: `Review feedback: ${rejectFeedback}`,
          previewPort: null,
          previewPid: null,
        }),
      });
      // Trigger agent with feedback (agent will checkout existing branch)
      await fetch(`/api/projects/${projectId}/stories/${story.id}/trigger-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: rejectFeedback }),
      });
      const refreshRes = await fetch(`/api/projects/${projectId}/stories/${story.id}`);
      if (refreshRes.ok) {
        const updated = await refreshRes.json();
        onUpdated(updated);
      }
      toast.success("Feedback sent — agent will rework the story on same branch");
      setRejecting(false);
      setRejectFeedback("");
    } catch {
      toast.error("Failed to send feedback");
    } finally {
      setReviewLoading(false);
    }
  }

  function handleClose() {
    setEditTitle("");
    setEditDescription("");
    setEditPriority("");
    setEditType("");
    setEditPoints("");
    setRejecting(false);
    setRejectFeedback("");
    onClose();
  }

  return (
    <Sheet open={isOpen} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        {story && (
          <>
            <SheetHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {story.shortId}
                </Badge>
                <Badge
                  className={
                    story.status === "DONE"
                      ? "bg-green-500"
                      : story.status === "IN_PROGRESS"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                  }
                >
                  {story.status.replace("_", " ")}
                </Badge>
                {story.assignedToAgent && (
                  <Badge variant="secondary">
                    <Bot className="mr-1 h-3 w-3" />
                    Claude Code
                  </Badge>
                )}
              </div>
              <SheetTitle className="text-left text-lg">{story.title}</SheetTitle>
            </SheetHeader>

            {story.status === "REVIEW" && story.assignedToAgent && (
              <div className="mt-4 rounded-lg border border-purple-500/30 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Agent completed — awaiting your review</span>
                </div>
                {story.agentNotes && (
                  <div className="text-sm text-muted-foreground bg-muted rounded p-3">
                    <span className="font-medium text-foreground">Agent notes: </span>
                    {story.agentNotes}
                  </div>
                )}
                {story.branchName && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <GitBranch className="h-3.5 w-3.5" />
                    <span className="font-mono">{story.branchName}</span>
                  </div>
                )}
                {story.previewPort && (
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-green-500 animate-pulse" />
                    <a
                      href={`/api/preview/${story.shortId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-500 hover:underline font-mono"
                    >
                      Preview: /preview/{story.shortId}
                    </a>
                  </div>
                )}
                {story.commitHash && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Commit: {story.commitHash}
                  </p>
                )}
                {!rejecting ? (
                  <div className="flex gap-2">
                    <Button
                      onClick={handleApprove}
                      disabled={reviewLoading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      {reviewLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <ThumbsUp className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setRejecting(true)}
                      disabled={reviewLoading}
                      className="flex-1 border-red-500/50 text-red-500 hover:bg-red-500/10"
                    >
                      <ThumbsDown className="mr-2 h-4 w-4" />
                      Request Changes
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Textarea
                      value={rejectFeedback}
                      onChange={(e) => setRejectFeedback(e.target.value)}
                      placeholder="Describe what needs to be fixed..."
                      className="min-h-[80px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleReject}
                        disabled={reviewLoading || !rejectFeedback.trim()}
                        className="flex-1"
                        variant="destructive"
                      >
                        {reviewLoading ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Feedback & Re-trigger Agent
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => { setRejecting(false); setRejectFeedback(""); }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="w-full">
                <TabsTrigger value="details" className="flex-1">
                  Details
                </TabsTrigger>
                <TabsTrigger value="criteria" className="flex-1">
                  Criteria ({story.acceptanceCriteria.length})
                </TabsTrigger>
                <TabsTrigger value="claude" className="flex-1">
                  Claude Code
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 min-h-[100px]"
                  />
                </div>

                {story.userStory && (
                  <div>
                    <label className="text-sm font-medium">User Story</label>
                    <p className="text-sm text-muted-foreground mt-1 italic">{story.userStory}</p>
                  </div>
                )}

                {story.rawInput && (
                  <div>
                    <label className="text-sm font-medium">Original Input</label>
                    <p className="text-sm text-muted-foreground mt-1 bg-muted rounded p-2">
                      {story.rawInput}
                    </p>
                  </div>
                )}

                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-sm font-medium">Type</label>
                    <Select value={editType} onValueChange={setEditType}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STORY_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Priority</label>
                    <Select value={editPriority} onValueChange={setEditPriority}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Story Points</label>
                    <Select value={editPoints} onValueChange={setEditPoints}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Unestimated" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 5, 8, 13].map((p) => (
                          <SelectItem key={p} value={String(p)}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-1 flex-wrap">
                  {story.labels.map(({ label }) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{ borderColor: label.color, color: label.color }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving} className="flex-1">
                    {saving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="criteria" className="space-y-3 mt-4">
                {story.acceptanceCriteria.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No acceptance criteria. Use AI rewrite to generate them.
                  </p>
                ) : (
                  story.acceptanceCriteria.map((ac) => (
                    <div key={ac.id} className="rounded-lg border p-3 text-sm">
                      <div>
                        <span className="font-medium text-muted-foreground">Given </span>
                        {ac.given}
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">When </span>
                        {ac.when}
                      </div>
                      <div>
                        <span className="font-medium text-muted-foreground">Then </span>
                        {ac.then}
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              <TabsContent value="claude" className="space-y-4 mt-4">
                <p className="text-sm text-muted-foreground">
                  Copy this prompt and paste it into Claude Code to start implementation.
                </p>
                <div className="relative">
                  <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-[400px] whitespace-pre-wrap">
                    {generateClaudePrompt()}
                  </pre>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      navigator.clipboard.writeText(generateClaudePrompt());
                      toast.success("Prompt copied to clipboard!");
                    }}
                  >
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

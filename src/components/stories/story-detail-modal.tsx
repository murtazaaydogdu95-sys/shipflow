"use client";

import { useState } from "react";
import useSWR from "swr";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Copy, Bot, Save, Loader2, Ban, Paperclip, ScrollText, GitCompare, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations } from "@/types";
import { STORY_TYPES } from "@/types";
import { useSoloMode } from "@/hooks/use-solo-mode";
import { DiffViewer } from "@/components/stories/diff-viewer";
import { AIReview } from "@/components/stories/ai-review";
import { StoryComments } from "@/components/stories/story-comments";
import { StoryDependencies } from "@/components/stories/story-dependencies";
import { StoryAttachments } from "@/components/stories/story-attachments";
import { StoryAgentLogs } from "@/components/stories/story-agent-logs";
import { StoryReviewPanel } from "@/components/stories/story-review-panel";

type MemberOption = { id: string; name: string | null; image: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface StoryDetailModalProps {
  story: StoryWithRelations | null;
  projectId: string;
  onClose: () => void;
  onUpdated: (story: StoryWithRelations) => void;
}

export function StoryDetailModal({
  story,
  projectId,
  onClose,
  onUpdated,
}: StoryDetailModalProps) {
  const [saving, setSaving] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState("");
  const [editPoints, setEditPoints] = useState<string>("");
  const [editType, setEditType] = useState("");
  const [editAssigneeId, setEditAssigneeId] = useState<string>("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  const [hasViewedDiff, setHasViewedDiff] = useState(false);

  const { memberCount } = useSoloMode();
  const isOpen = !!story;

  const { data: members } = useSWR<MemberOption[]>(
    isOpen ? `/api/projects/${projectId}/members` : null,
    fetcher
  );

  // Lazy-load tab data: only fetch when the user clicks the corresponding tab
  const { data: comments, mutate: mutateComments } = useSWR(
    isOpen && story && activeTab === "comments" ? `/api/projects/${projectId}/stories/${story.id}/comments` : null,
    fetcher
  );

  const { data: depsData, mutate: mutateDeps } = useSWR(
    isOpen && story && activeTab === "deps" ? `/api/projects/${projectId}/stories/${story.id}/dependencies` : null,
    fetcher
  );

  const { data: attachments, mutate: mutateAttachments } = useSWR(
    isOpen && story && activeTab === "files" ? `/api/projects/${projectId}/stories/${story.id}/attachments` : null,
    fetcher
  );

  const { data: agentLogs } = useSWR(
    isOpen && story?.assignedToAgent && activeTab === "logs" ? `/api/projects/${projectId}/stories/${story.id}/logs` : null,
    fetcher,
    { refreshInterval: story?.agentStatus === "RUNNING" && activeTab === "logs" ? 5000 : 0 }
  );

  const { data: diffData } = useSWR(
    isOpen && story?.branchName && activeTab === "diff" ? `/api/projects/${projectId}/stories/${story.id}/diff` : null,
    fetcher,
    {
      onSuccess: (data) => {
        if (data?.diff && story && !hasViewedDiff) {
          setHasViewedDiff(true);
          // Persist review confirmation server-side
          fetch(`/api/projects/${projectId}/stories/${story.id}/confirm-review`, {
            method: "POST",
          }).catch(() => {});
        }
      },
    }
  );

  // Sync state when story changes
  if (story && editTitle === "" && story.title !== editTitle) {
    setEditTitle(story.title);
    setEditDescription(story.description || "");
    setEditPriority(story.priority);
    setEditType((story as StoryWithRelations & { type?: string }).type || "feature");
    setEditPoints(story.storyPoints ? String(story.storyPoints) : "");
    setEditAssigneeId(story.assigneeId || "");
    setActiveTab("details");
    setHasViewedDiff(false);
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
          assigneeId: editAssigneeId || null,
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

  async function handleReject(feedback: string) {
    if (!story || !feedback.trim()) {
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
          agentNotes: `Review feedback: ${feedback}`,
          previewPort: null,
          previewPid: null,
        }),
      });

      // Store rejection as persistent activity for agent learning
      await fetch(`/api/projects/${projectId}/stories/${story.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `[Agent Rejection] ${feedback}`,
          metadata: JSON.stringify({ type: "AGENT_REJECTED", feedback, storyType: (story as StoryWithRelations & { type?: string }).type || "feature" }),
        }),
      }).catch(() => {}); // non-critical
      // Trigger agent with feedback (agent will checkout existing branch)
      await fetch(`/api/projects/${projectId}/stories/${story.id}/trigger-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback }),
      });
      const refreshRes = await fetch(`/api/projects/${projectId}/stories/${story.id}`);
      if (refreshRes.ok) {
        const updated = await refreshRes.json();
        onUpdated(updated);
      }
      toast.success("Feedback sent — agent will rework the story on same branch");
    } catch {
      toast.error("Failed to send feedback");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleRevert() {
    if (!story) return;
    if (!confirm("This will delete the agent's branch and reset the story to TODO. Continue?")) return;
    setReviewLoading(true);
    try {
      if (story.previewPort) {
        await fetch(`/api/projects/${projectId}/stories/${story.id}/preview`, { method: "DELETE" });
      }
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/revert`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to revert");
        return;
      }
      const refreshRes = await fetch(`/api/projects/${projectId}/stories/${story.id}`);
      if (refreshRes.ok) onUpdated(await refreshRes.json());
      toast.success("Agent work reverted");
    } catch {
      toast.error("Failed to revert agent work");
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleAddDependency(blockerId: string) {
    if (!story) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/dependencies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add dependency");
        return;
      }
      await mutateDeps();
      toast.success("Dependency added");
    } catch {
      toast.error("Failed to add dependency");
    }
  }

  async function handleRemoveDependency(depId: string) {
    if (!story) return;
    try {
      await fetch(`/api/projects/${projectId}/stories/${story.id}/dependencies/${depId}`, { method: "DELETE" });
      await mutateDeps();
    } catch {
      toast.error("Failed to remove dependency");
    }
  }

  async function handleUploadAttachment(file: File) {
    if (!story) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/attachments`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Upload failed");
        return;
      }
      await mutateAttachments();
      toast.success("File uploaded");
    } catch {
      toast.error("Upload failed");
    }
  }

  function handleClose() {
    setEditTitle("");
    setEditDescription("");
    setEditPriority("");
    setEditType("");
    setEditPoints("");
    setEditAssigneeId("");
    setCommentText("");
    setHasViewedDiff(false);
    onClose();
  }

  async function handleAddComment() {
    if (!story || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (!res.ok) throw new Error();
      setCommentText("");
      await mutateComments();
    } catch {
      toast.error("Failed to add comment");
    } finally {
      setCommentLoading(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!story) return;
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/comments/${commentId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await mutateComments();
    } catch {
      toast.error("Failed to delete comment");
    }
  }

  async function handleDeploy() {
    if (!story) return;
    setDeploying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/${story.id}/deploy`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Deploy failed");
      } else {
        const data = await res.json();
        if (data.url) toast.success(`Deployed: ${data.url}`);
        else toast.error("Deploy failed");
      }
    } catch { toast.error("Deploy failed"); }
    finally { setDeploying(false); }
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
                  data-testid="story-detail-status"
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
              <StoryReviewPanel
                story={{
                  shortId: story.shortId,
                  agentNotes: story.agentNotes,
                  branchName: story.branchName,
                  previewPort: story.previewPort,
                  commitHash: story.commitHash,
                  deployStatus: story.deployStatus,
                  deployUrl: story.deployUrl,
                }}
                reviewLoading={reviewLoading}
                hasViewedDiff={hasViewedDiff}
                onApprove={handleApprove}
                onReject={handleReject}
                onRevert={handleRevert}
                onDeploy={handleDeploy}
                onViewDiff={() => setActiveTab("diff")}
                deploying={deploying}
              />
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="w-full flex-wrap h-auto gap-0.5 p-1">
                <TabsTrigger value="details" className="flex-1 text-xs">
                  Details
                </TabsTrigger>
                <TabsTrigger value="criteria" className="flex-1 text-xs">
                  Criteria ({story.acceptanceCriteria.length})
                </TabsTrigger>
                <TabsTrigger value="deps" className="flex-1 text-xs">
                  <Ban className="h-3 w-3 mr-1" />
                  Deps {depsData?.blockedBy?.length ? `(${depsData.blockedBy.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="comments" className="flex-1 text-xs">
                  <MessageSquare className="h-3 w-3 mr-1" />
                  {comments?.length ? `(${comments.length})` : ""}
                </TabsTrigger>
                <TabsTrigger value="files" className="flex-1 text-xs">
                  <Paperclip className="h-3 w-3 mr-1" />
                  {attachments?.length ? `(${attachments.length})` : ""}
                </TabsTrigger>
                {story.assignedToAgent && (
                  <TabsTrigger value="logs" className="flex-1 text-xs">
                    <ScrollText className="h-3 w-3 mr-1" />
                    Logs
                  </TabsTrigger>
                )}
                {story.branchName && (
                  <TabsTrigger value="diff" className="flex-1 text-xs">
                    <GitCompare className="h-3 w-3 mr-1" />
                    Diff
                  </TabsTrigger>
                )}
                <TabsTrigger value="claude" className="flex-1 text-xs">
                  Claude
                </TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Title</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="mt-1"
                    data-testid="story-detail-title"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="mt-1 min-h-[100px]"
                    data-testid="story-detail-description"
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
                      <SelectTrigger className="mt-1" data-testid="story-detail-priority">
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

                {memberCount > 1 && (
                  <div>
                    <label className="text-sm font-medium">Assignee</label>
                    <Select value={editAssigneeId || "unassigned"} onValueChange={(v) => setEditAssigneeId(v === "unassigned" ? "" : v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {members?.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                  <Button onClick={handleSave} disabled={saving} className="flex-1" data-testid="story-detail-save">
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

              <TabsContent value="comments" className="space-y-4 mt-4">
                <StoryComments
                  comments={comments}
                  newComment={commentText}
                  setNewComment={setCommentText}
                  addComment={handleAddComment}
                  deleteComment={handleDeleteComment}
                  commentLoading={commentLoading}
                />
              </TabsContent>

              <TabsContent value="deps" className="space-y-4 mt-4">
                <StoryDependencies
                  depsData={depsData}
                  projectId={projectId}
                  storyId={story.id}
                  onAddDependency={handleAddDependency}
                  onRemoveDependency={handleRemoveDependency}
                />
              </TabsContent>

              <TabsContent value="files" className="space-y-4 mt-4">
                <StoryAttachments
                  attachments={attachments}
                  onUpload={handleUploadAttachment}
                />
              </TabsContent>

              {story.assignedToAgent && (
                <TabsContent value="logs" className="space-y-4 mt-4">
                  <StoryAgentLogs
                    logs={agentLogs}
                    agentStatus={story.agentStatus}
                    branchName={story.branchName}
                    onRevert={handleRevert}
                    reviewLoading={reviewLoading}
                  />
                </TabsContent>
              )}

              {story.branchName && (
                <TabsContent value="diff" className="space-y-4 mt-4">
                  <AIReview projectId={projectId} storyId={story.id} />
                  <Separator />
                  {diffData?.diff ? (
                    <DiffViewer rawDiff={diffData.diff} />
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      {diffData?.error || "Loading diff..."}
                    </p>
                  )}
                </TabsContent>
              )}

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

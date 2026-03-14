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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Copy, Bot, Check, Save, Loader2, Trash2, ThumbsUp, ThumbsDown, Send, GitBranch, Globe, MessageSquare, Ban, Undo2, Paperclip, FileText, ScrollText, GitCompare, Rocket } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations } from "@/types";
import { STORY_TYPES } from "@/types";
import { cn } from "@/lib/utils";
import { useSoloMode } from "@/hooks/use-solo-mode";
import { DiffViewer } from "@/components/stories/diff-viewer";
import { AIReview } from "@/components/stories/ai-review";

type MemberOption = { id: string; name: string | null; image: string | null };

const fetcher = (url: string) => fetch(url).then((r) => r.json());

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
  const [editAssigneeId, setEditAssigneeId] = useState<string>("");
  const [rejecting, setRejecting] = useState(false);
  const [rejectFeedback, setRejectFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);
  const [deploying, setDeploying] = useState(false);

  const { memberCount } = useSoloMode();
  const isOpen = !!story;

  const { data: members } = useSWR<MemberOption[]>(
    isOpen ? `/api/projects/${projectId}/members` : null,
    fetcher
  );

  const { data: comments, mutate: mutateComments } = useSWR(
    isOpen && story ? `/api/projects/${projectId}/stories/${story.id}/comments` : null,
    fetcher
  );

  const { data: depsData, mutate: mutateDeps } = useSWR(
    isOpen && story ? `/api/projects/${projectId}/stories/${story.id}/dependencies` : null,
    fetcher
  );

  const { data: attachments, mutate: mutateAttachments } = useSWR(
    isOpen && story ? `/api/projects/${projectId}/stories/${story.id}/attachments` : null,
    fetcher
  );

  const { data: agentLogs } = useSWR(
    isOpen && story?.assignedToAgent ? `/api/projects/${projectId}/stories/${story.id}/logs` : null,
    fetcher,
    { refreshInterval: story?.agentStatus === "RUNNING" ? 5000 : 0 }
  );

  const { data: diffData } = useSWR(
    isOpen && story?.branchName ? `/api/projects/${projectId}/stories/${story.id}/diff` : null,
    fetcher
  );

  // Sync state when story changes
  if (story && editTitle === "" && story.title !== editTitle) {
    setEditTitle(story.title);
    setEditDescription(story.description || "");
    setEditPriority(story.priority);
    setEditType((story as StoryWithRelations & { type?: string }).type || "feature");
    setEditPoints(story.storyPoints ? String(story.storyPoints) : "");
    setEditAssigneeId(story.assigneeId || "");
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
    setRejecting(false);
    setRejectFeedback("");
    setCommentText("");
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
                {(story.previewPort || story.branchName) && (
                  <div className="flex items-center gap-1.5">
                    <Globe className={`h-3.5 w-3.5 ${story.previewPort ? "text-green-500 animate-pulse" : "text-muted-foreground"}`} />
                    <a
                      href={`/api/preview/${story.shortId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`text-xs hover:underline font-mono ${story.previewPort ? "text-green-500" : "text-muted-foreground"}`}
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
                {story.deployStatus && story.deployStatus !== "idle" && (
                  <div className="flex items-center gap-2 text-xs">
                    <Rocket className={`h-3.5 w-3.5 ${story.deployStatus === "deployed" ? "text-green-500" : story.deployStatus === "deploying" ? "text-yellow-500 animate-pulse" : "text-red-500"}`} />
                    <span className="capitalize">{story.deployStatus}</span>
                    {story.deployUrl && (
                      <a href={story.deployUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline font-mono truncate">
                        {story.deployUrl}
                      </a>
                    )}
                  </div>
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
                      onClick={async () => {
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
                      }}
                      disabled={deploying || reviewLoading}
                      title="Deploy branch"
                    >
                      {deploying ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Rocket className="mr-1 h-4 w-4" />}
                      Deploy
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRevert}
                      disabled={reviewLoading}
                      title="Revert agent work"
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Undo2 className="h-4 w-4" />
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

              <TabsContent value="comments" className="space-y-4 mt-4">
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {(!comments || comments.length === 0) ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No comments yet. Start the conversation.
                    </p>
                  ) : (
                    comments.map((comment: { id: string; content: string; createdAt: string; userId: string; user: { id: string; name: string | null; image: string | null } }) => (
                      <div key={comment.id} className="flex gap-3 group">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={comment.user.image ?? undefined} />
                          <AvatarFallback className="text-[10px]">
                            {(comment.user.name?.[0] || "?").toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{comment.user.name || "Unknown"}</span>
                            <span className="text-xs text-muted-foreground">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                              title="Delete comment"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[60px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        handleAddComment();
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    onClick={handleAddComment}
                    disabled={commentLoading || !commentText.trim()}
                    className="shrink-0 self-end"
                  >
                    {commentLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="deps" className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium">Blocked By</label>
                  {depsData?.blockedBy?.length > 0 ? (
                    <div className="mt-2 space-y-1">
                      {depsData.blockedBy.map((dep: { id: string; blocker: { id: string; shortId: string; title: string; status: string } }) => (
                        <div key={dep.id} className="flex items-center gap-2 text-sm rounded border p-2">
                          <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                          <span className="font-mono text-xs text-muted-foreground">{dep.blocker.shortId}</span>
                          <span className="flex-1 truncate">{dep.blocker.title}</span>
                          <Badge variant={dep.blocker.status === "DONE" ? "default" : "secondary"} className="text-[10px]">
                            {dep.blocker.status}
                          </Badge>
                          <button onClick={() => handleRemoveDependency(dep.id)} className="text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No blockers</p>
                  )}
                </div>
                {depsData?.blocking?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Blocking</label>
                    <div className="mt-2 space-y-1">
                      {depsData.blocking.map((dep: { id: string; blocked: { id: string; shortId: string; title: string; status: string } }) => (
                        <div key={dep.id} className="flex items-center gap-2 text-sm rounded border p-2">
                          <span className="font-mono text-xs text-muted-foreground">{dep.blocked.shortId}</span>
                          <span className="flex-1 truncate">{dep.blocked.title}</span>
                          <Badge variant="secondary" className="text-[10px]">{dep.blocked.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium">Add Blocker</label>
                  <DependencySearch projectId={projectId} storyId={story.id} onAdd={handleAddDependency} />
                </div>
              </TabsContent>

              <TabsContent value="files" className="space-y-4 mt-4">
                <div>
                  <label
                    className="flex items-center gap-2 text-sm font-medium cursor-pointer border-2 border-dashed rounded-lg p-4 hover:border-primary/50 transition-colors text-center justify-center"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file) handleUploadAttachment(file);
                    }}
                  >
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Drop file or click to upload (max 10MB)</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAttachment(file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {attachments?.length > 0 ? (
                  <div className="space-y-2">
                    {attachments.map((att: { id: string; filename: string; url: string; size: number; mimeType: string }) => (
                      <a key={att.id} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm rounded border p-2 hover:bg-muted/50 transition-colors">
                        {att.mimeType.startsWith("image/") ? (
                          <img src={att.url} alt={att.filename} className="h-8 w-8 object-cover rounded" />
                        ) : (
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="flex-1 truncate">{att.filename}</span>
                        <span className="text-xs text-muted-foreground">{(att.size / 1024).toFixed(0)} KB</span>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No attachments yet.</p>
                )}
              </TabsContent>

              {story.assignedToAgent && (
                <TabsContent value="logs" className="space-y-4 mt-4">
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Agent Logs</span>
                    {story.agentStatus === "RUNNING" && (
                      <Badge variant="secondary" className="text-[10px] animate-pulse">Live</Badge>
                    )}
                    {agentLogs?.totalLines > 0 && (
                      <span className="text-xs text-muted-foreground ml-auto">{agentLogs.totalLines} lines</span>
                    )}
                  </div>
                  <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
                    {agentLogs?.log || "No logs available. Agent may not have started yet."}
                  </pre>
                  {story.branchName && !story.agentStatus?.match(/RUNNING|QUEUED/) && (
                    <Button variant="outline" size="sm" onClick={handleRevert} disabled={reviewLoading}>
                      <Undo2 className="mr-2 h-3.5 w-3.5" />
                      Revert Agent Work
                    </Button>
                  )}
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

function DependencySearch({ projectId, storyId, onAdd }: { projectId: string; storyId: string; onAdd: (blockerId: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: results } = useSWR<Array<{ id: string; shortId: string; title: string; status: string }>>(
    search.length >= 2 ? `/api/projects/${projectId}/stories?search=${encodeURIComponent(search)}` : null,
    fetcher
  );

  const filtered = results?.filter((s) => s.id !== storyId) ?? [];

  return (
    <div className="mt-1">
      <Input
        placeholder="Search by ID or title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      {filtered.length > 0 && (
        <div className="mt-1 border rounded max-h-32 overflow-y-auto">
          {filtered.slice(0, 5).map((s) => (
            <button
              key={s.id}
              onClick={() => { onAdd(s.id); setSearch(""); }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
            >
              <span className="font-mono text-xs text-muted-foreground">{s.shortId}</span>
              <span className="truncate flex-1">{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

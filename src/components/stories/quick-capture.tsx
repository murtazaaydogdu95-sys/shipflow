"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Sparkles, Check, ArrowUpRight, LayoutTemplate, Terminal, Scissors } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations } from "@/types";
import { STORY_TYPES } from "@/types";
import { TemplatePicker } from "./template-picker";
import { parseCommand, type ParsedCommand } from "@/lib/command-parser";
import type { StoryTemplate } from "@/lib/story-templates";

interface QuickCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  labels: Array<{ id: string; name: string; color: string }>;
  techStack?: string | null;
  onCreated: (story: StoryWithRelations) => void;
}

interface AIRewrite {
  title: string;
  userStory: string;
  acceptanceCriteria: Array<{ given: string; when: string; then: string }>;
  storyPoints: number;
  priority: string;
  labels: string[];
}

type CaptureMode = "blank" | "templates";

export function QuickCapture({
  open,
  onOpenChange,
  projectId,
  labels,
  techStack,
  onCreated,
}: QuickCaptureProps) {
  const [rawInput, setRawInput] = useState("");
  const [rewriting, setRewriting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [rewrite, setRewrite] = useState<AIRewrite | null>(null);
  const [mode, setMode] = useState<CaptureMode>("blank");
  const [executingCommand, setExecutingCommand] = useState(false);
  const [splitting, setSplitting] = useState(false);

  // Rewrite usage tracking
  const [rewriteUsage, setRewriteUsage] = useState<{
    used: number; limit: number | null; remaining: number | null; unlimited: boolean;
  } | null>(null);

  const fetchUsage = useCallback(() => {
    fetch(`/api/projects/${projectId}/stories/rewrite-usage`)
      .then((r) => r.json())
      .then(setRewriteUsage)
      .catch(() => {});
  }, [projectId]);

  useEffect(() => {
    if (open) fetchUsage();
  }, [open, fetchUsage]);

  // Editable fields after rewrite
  const [title, setTitle] = useState("");
  const [userStory, setUserStory] = useState("");
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [priority, setPriority] = useState("MEDIUM");
  const [type, setType] = useState("feature");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<AIRewrite["acceptanceCriteria"]>([]);

  // Natural language command detection
  const detectedCommand = useMemo(() => parseCommand(rawInput), [rawInput]);

  async function handleRewrite() {
    if (!rawInput.trim()) return;
    setRewriting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, techStack }),
      });
      const data = await res.json();
      if (data._rewriteUsage) {
        setRewriteUsage((prev) => prev ? { ...prev, ...data._rewriteUsage } : prev);
      }
      if (!res.ok) {
        toast.error(data.error || "Rewrite failed");
        return;
      }
      setRewrite(data);
      setTitle(data.title);
      setUserStory(data.userStory);
      setStoryPoints(data.storyPoints);
      setPriority(data.priority);
      setAcceptanceCriteria(data.acceptanceCriteria || []);
    } catch {
      toast.error("AI rewrite failed. Check your API key.");
    } finally {
      setRewriting(false);
    }
  }

  function handleTemplateSelect(template: StoryTemplate) {
    setRewrite({
      title: template.title,
      userStory: template.userStory,
      acceptanceCriteria: template.acceptanceCriteria,
      storyPoints: template.storyPoints,
      priority: template.priority,
      labels: [],
    });
    setTitle(template.title);
    setUserStory(template.userStory);
    setStoryPoints(template.storyPoints);
    setPriority(template.priority);
    setType(template.type);
    setAcceptanceCriteria(template.acceptanceCriteria);
    setMode("blank"); // Switch to edit view
  }

  async function handleExecuteCommand(cmd: ParsedCommand) {
    setExecutingCommand(true);
    try {
      // Resolve story by shortId
      const searchRes = await fetch(`/api/projects/${projectId}/stories?search=${encodeURIComponent(cmd.storyRef)}`);
      if (!searchRes.ok) throw new Error("Search failed");
      const stories = await searchRes.json();
      const story = stories.find((s: { shortId: string }) => s.shortId === cmd.storyRef);
      if (!story) {
        toast.error(`Story ${cmd.storyRef} not found`);
        return;
      }

      if (cmd.type === "delete") {
        const res = await fetch(`/api/projects/${projectId}/stories/${story.id}`, { method: "DELETE" });
        if (!res.ok) throw new Error();
        toast.success(`Deleted ${cmd.storyRef}`);
      } else if (cmd.type === "move" || cmd.type === "close") {
        const status = cmd.target === "IN PROGRESS" ? "IN_PROGRESS" : cmd.target;
        const res = await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Moved ${cmd.storyRef} to ${cmd.target}`);
      } else if (cmd.type === "prioritize") {
        const res = await fetch(`/api/projects/${projectId}/stories/${story.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ priority: cmd.target }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Set ${cmd.storyRef} priority to ${cmd.target}`);
      }

      reset();
      onOpenChange(false);
    } catch {
      toast.error("Failed to execute command");
    } finally {
      setExecutingCommand(false);
    }
  }

  async function handleSplit() {
    if (!rawInput.trim()) return;
    setSplitting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, techStack }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Split failed");
        return;
      }
      const data = await res.json();
      // Open split dialog by creating stories directly with confirmation
      if (data.stories && data.stories.length > 0) {
        const createRes = await fetch(`/api/projects/${projectId}/stories/bulk-create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stories: data.stories }),
        });
        if (!createRes.ok) throw new Error();
        const created = await createRes.json();
        toast.success(`Created ${created.length} stories from split`);
        if (created[0]) onCreated(created[0]);
        reset();
        onOpenChange(false);
      }
    } catch {
      toast.error("Failed to split story");
    } finally {
      setSplitting(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const matchedLabelIds = rewrite?.labels
        ?.map((name: string) => labels.find((l) => l.name === name)?.id)
        .filter(Boolean) as string[] | undefined;

      const res = await fetch(`/api/projects/${projectId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || rawInput.slice(0, 80),
          description: userStory || rawInput,
          rawInput,
          userStory,
          storyPoints,
          priority,
          type,
          acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : rewrite?.acceptanceCriteria,
          labelIds: matchedLabelIds,
        }),
      });
      if (!res.ok) throw new Error();
      const story = await res.json();
      toast.success(`Story ${story.shortId} created!`);
      onCreated(story);
      reset();
    } catch {
      toast.error("Failed to create story");
    } finally {
      setCreating(false);
    }
  }

  function reset() {
    setRawInput("");
    setRewrite(null);
    setTitle("");
    setUserStory("");
    setStoryPoints(3);
    setPriority("MEDIUM");
    setType("feature");
    setAcceptanceCriteria([]);
    setMode("blank");
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Quick Capture</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as CaptureMode)}>
            <TabsList className="h-8">
              <TabsTrigger value="blank" className="text-xs gap-1 px-3 h-6">
                <Terminal className="h-3 w-3" />
                Blank
              </TabsTrigger>
              <TabsTrigger value="templates" className="text-xs gap-1 px-3 h-6">
                <LayoutTemplate className="h-3 w-3" />
                Templates
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === "templates" && !rewrite && (
            <TemplatePicker onSelect={handleTemplateSelect} />
          )}

          {mode === "blank" && !rewrite && (
            <>
              {/* Raw input */}
              <div>
                <Textarea
                  placeholder='What do you want to build? e.g. "add webhook for failed payments"'
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="min-h-[80px] text-base"
                  autoFocus
                />

                {/* Natural language command preview */}
                {detectedCommand && (
                  <div className="mt-2 rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-blue-500 shrink-0" />
                    <span className="text-sm flex-1">{detectedCommand.description}</span>
                    <Button
                      size="sm"
                      onClick={() => handleExecuteCommand(detectedCommand)}
                      disabled={executingCommand}
                      className="shrink-0"
                    >
                      {executingCommand ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                      Execute
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRawInput("")}
                      className="shrink-0 text-xs"
                    >
                      Create as Story Instead
                    </Button>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 mt-2">
                  {rewriteUsage && !rewriteUsage.unlimited && (
                    <span className={`text-xs ${rewriteUsage.remaining === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {rewriteUsage.remaining === 0
                        ? "No rewrites left today"
                        : `${rewriteUsage.remaining}/${rewriteUsage.limit} rewrites left today`}
                    </span>
                  )}
                  {rawInput.trim().length > 100 && (
                    <Button
                      onClick={handleSplit}
                      disabled={splitting}
                      variant="outline"
                      size="sm"
                    >
                      {splitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Scissors className="mr-2 h-4 w-4" />
                      )}
                      Split into Stories
                    </Button>
                  )}
                  {rewriteUsage && !rewriteUsage.unlimited && rewriteUsage.remaining === 0 ? (
                    <Button variant="secondary" size="sm" asChild>
                      <a href="/billing">
                        Upgrade <ArrowUpRight className="ml-1 h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRewrite}
                      disabled={!rawInput.trim() || rewriting}
                      variant="secondary"
                      size="sm"
                    >
                      {rewriting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="mr-2 h-4 w-4" />
                      )}
                      Rewrite with AI
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}

          {/* AI Rewrite Preview / Template Preview */}
          {rewrite && (
            <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">User Story</label>
                <Textarea
                  value={userStory}
                  onChange={(e) => setUserStory(e.target.value)}
                  className="mt-1 min-h-[60px]"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Acceptance Criteria
                </label>
                <div className="mt-1 space-y-1.5">
                  {acceptanceCriteria.map((ac, i) => (
                    <div key={i} className="text-sm bg-background rounded p-2 border">
                      <span className="text-muted-foreground">Given</span> {ac.given}{" "}
                      <span className="text-muted-foreground">When</span> {ac.when}{" "}
                      <span className="text-muted-foreground">Then</span> {ac.then}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Type</label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="w-32 mt-1">
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
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Story Points</label>
                  <Select
                    value={String(storyPoints)}
                    onValueChange={(v) => setStoryPoints(Number(v))}
                  >
                    <SelectTrigger className="w-24 mt-1">
                      <SelectValue />
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
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Priority</label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger className="w-32 mt-1">
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
              </div>
              {rewrite.labels && rewrite.labels.length > 0 && (
                <div className="flex gap-1 flex-wrap">
                  {rewrite.labels.map((l: string) => (
                    <Badge key={l} variant="secondary" className="text-xs">
                      {l}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={creating || (!rawInput.trim() && !title)}>
              {creating ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              {rewrite ? "Create Story" : "Create Raw Story"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

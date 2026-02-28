"use client";

import { useState } from "react";
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
import { Loader2, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import type { StoryWithRelations } from "@/types";
import { STORY_TYPES } from "@/types";

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

  // Editable fields after rewrite
  const [title, setTitle] = useState("");
  const [userStory, setUserStory] = useState("");
  const [storyPoints, setStoryPoints] = useState<number>(3);
  const [priority, setPriority] = useState("MEDIUM");
  const [type, setType] = useState("feature");

  async function handleRewrite() {
    if (!rawInput.trim()) return;
    setRewriting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput, techStack }),
      });
      if (!res.ok) throw new Error("Rewrite failed");
      const data = await res.json();
      setRewrite(data);
      setTitle(data.title);
      setUserStory(data.userStory);
      setStoryPoints(data.storyPoints);
      setPriority(data.priority);
    } catch {
      toast.error("AI rewrite failed. Check your API key.");
    } finally {
      setRewriting(false);
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
          acceptanceCriteria: rewrite?.acceptanceCriteria,
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
          {/* Raw input */}
          <div>
            <Textarea
              placeholder='What do you want to build? e.g. "add stripe webhook for failed payments"'
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              className="min-h-[80px] text-base"
              autoFocus
            />
            <div className="flex justify-end mt-2">
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
            </div>
          </div>

          {/* AI Rewrite Preview */}
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
                  {rewrite.acceptanceCriteria.map((ac, i) => (
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
              {rewrite.labels && (
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

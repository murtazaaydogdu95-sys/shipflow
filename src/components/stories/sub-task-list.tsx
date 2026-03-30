"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubTask {
  id: string;
  shortId: string;
  title: string;
  status: string;
  priority: string;
  type: string;
}

interface SubTaskListProps {
  projectId: string;
  parentStoryId: string;
  children: SubTask[];
  onSubTaskClick: (storyId: string) => void;
  onSubTaskCreated: () => void;
}

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-500 text-white",
  HIGH: "bg-orange-500 text-white",
  MEDIUM: "bg-yellow-500 text-white",
  LOW: "bg-gray-400 text-white",
};

const statusColors: Record<string, string> = {
  DONE: "bg-green-500/15 text-green-700 border-green-500/30",
  IN_PROGRESS: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  REVIEW: "bg-purple-500/15 text-purple-700 border-purple-500/30",
  TODO: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  BACKLOG: "bg-gray-500/15 text-gray-700 border-gray-500/30",
  ICEBOX: "bg-gray-500/15 text-gray-700 border-gray-500/30",
};

export function SubTaskList({
  projectId,
  parentStoryId,
  children,
  onSubTaskClick,
  onSubTaskCreated,
}: SubTaskListProps) {
  const [expanded, setExpanded] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState("feature");
  const [newPriority, setNewPriority] = useState("MEDIUM");
  const [creating, setCreating] = useState(false);

  const doneCount = children.filter((c) => c.status === "DONE").length;
  const totalCount = children.length;
  const progressPercent = totalCount > 0 ? (doneCount / totalCount) * 100 : 0;

  async function handleCreateSubTask() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/stories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          type: newType,
          priority: newPriority,
          parentId: parentStoryId,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create sub-task");
      }
      setNewTitle("");
      setShowForm(false);
      onSubTaskCreated();
      toast.success("Sub-task created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create sub-task");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div data-testid="subtask-list" className="border rounded-lg">
      {/* Header */}
      <button
        className="flex items-center gap-2 w-full p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
        type="button"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="text-sm font-medium">
          Sub-tasks ({doneCount}/{totalCount} done)
        </span>
        {totalCount > 0 && (
          <div
            data-testid="subtask-progress"
            className="flex-1 max-w-[120px] h-1.5 bg-muted rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </button>

      {expanded && (
        <div className="border-t">
          {/* Sub-task rows */}
          {children.map((child) => (
            <button
              key={child.id}
              data-testid={`subtask-row-${child.shortId}`}
              className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/50 transition-colors border-b last:border-b-0"
              onClick={() => onSubTaskClick(child.id)}
              type="button"
            >
              <span className="text-xs text-muted-foreground font-mono shrink-0">
                {child.shortId}
              </span>
              <span className="text-sm truncate flex-1">{child.title}</span>
              <Badge
                variant="outline"
                className={cn("text-[10px] px-1 py-0 h-4 shrink-0", statusColors[child.status])}
              >
                {child.status.replace("_", " ")}
              </Badge>
              <Badge
                className={cn("text-[10px] px-1 py-0 h-4 shrink-0", priorityColors[child.priority])}
              >
                {child.priority[0]}
              </Badge>
            </button>
          ))}

          {/* Add sub-task form */}
          {showForm ? (
            <div className="p-3 space-y-2 border-t">
              <Input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Sub-task title"
                className="text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateSubTask();
                  if (e.key === "Escape") setShowForm(false);
                }}
                data-testid="subtask-title-input"
              />
              <div className="flex gap-2">
                <Select value={newType} onValueChange={setNewType}>
                  <SelectTrigger className="w-[120px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["feature", "bug", "chore", "refactor", "docs", "test"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  onClick={handleCreateSubTask}
                  disabled={creating || !newTitle.trim()}
                  className="h-8"
                  data-testid="subtask-create-btn"
                >
                  {creating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                  className="h-8"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <button
              data-testid="subtask-add-btn"
              className="flex items-center gap-1 w-full px-3 py-2 text-left text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors border-t"
              onClick={() => setShowForm(true)}
              type="button"
            >
              <Plus className="h-3.5 w-3.5" />
              Add sub-task
            </button>
          )}
        </div>
      )}
    </div>
  );
}

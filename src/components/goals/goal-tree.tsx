"use client";

import { useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { ChevronDown, ChevronRight, Plus, Target, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type GoalNode = {
  id: string;
  title: string;
  description: string | null;
  level: string;
  status: string;
  parentId: string | null;
  _count: { stories: number; children: number };
  progress?: { totalStories: number; completedStories: number; percentage: number };
};

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-slate-500",
  active: "bg-blue-500",
  completed: "bg-green-500",
};

const LEVEL_ORDER = ["company", "team", "project"] as const;

function GoalNodeRow({
  goal,
  allGoals,
  onDelete,
  onEdit,
}: {
  goal: GoalNode;
  allGoals: GoalNode[];
  onDelete: (id: string) => void;
  onEdit: (goal: GoalNode) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const children = allGoals.filter((g) => g.parentId === goal.id);
  const hasChildren = children.length > 0;
  const progress = goal.progress;

  return (
    <div data-testid="goal-node">
      <div className="flex items-center gap-2 py-2 px-3 hover:bg-accent/50 rounded-md group">
        <button
          onClick={() => setExpanded(!expanded)}
          className="shrink-0 w-5 h-5 flex items-center justify-center"
          disabled={!hasChildren}
        >
          {hasChildren ? (
            expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
          ) : (
            <span className="w-4" />
          )}
        </button>

        <Target className="h-4 w-4 shrink-0 text-muted-foreground" />

        <span className="font-medium text-sm flex-1 truncate">{goal.title}</span>

        <Badge className={`${STATUS_COLORS[goal.status] || "bg-slate-500"} text-white text-[10px]`}>
          {goal.status}
        </Badge>

        <Badge variant="outline" className="text-[10px]">
          {goal.level}
        </Badge>

        {progress && (
          <div className="flex items-center gap-2 min-w-[120px]">
            <Progress value={progress.percentage} className="h-2 flex-1" />
            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
              {progress.percentage}%
            </span>
          </div>
        )}

        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {goal._count.stories} {goal._count.stories === 1 ? "story" : "stories"}
        </span>

        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => onEdit(goal)}
          >
            <Edit2 className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive"
            onClick={() => onDelete(goal.id)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div className="ml-6 border-l pl-2">
          {children.map((child) => (
            <GoalNodeRow
              key={child.id}
              goal={child}
              allGoals={allGoals}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function GoalTree() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<GoalNode | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState<string>("project");
  const [status, setStatus] = useState<string>("planned");
  const [parentId, setParentId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const { data: goals, mutate } = useSWR<GoalNode[]>(
    orgId ? `/api/orgs/${orgId}/goals?progress=true` : null,
    fetcher
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setLevel("project");
    setStatus("planned");
    setParentId("");
    setEditGoal(null);
  }

  function handleOpenCreate() {
    resetForm();
    setCreateOpen(true);
  }

  function handleOpenEdit(goal: GoalNode) {
    setTitle(goal.title);
    setDescription(goal.description || "");
    setLevel(goal.level);
    setStatus(goal.status);
    setParentId(goal.parentId || "");
    setEditGoal(goal);
    setCreateOpen(true);
  }

  async function handleSave() {
    if (!orgId || !title.trim()) return;
    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        level,
        status,
        parentId: parentId || undefined,
      };

      const url = editGoal
        ? `/api/orgs/${orgId}/goals/${editGoal.id}`
        : `/api/orgs/${orgId}/goals`;
      const method = editGoal ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save goal");
        return;
      }

      toast.success(editGoal ? "Goal updated" : "Goal created");
      setCreateOpen(false);
      resetForm();
      await mutate();
    } catch {
      toast.error("Failed to save goal");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(goalId: string) {
    if (!orgId) return;
    if (!confirm("Delete this goal? Linked stories will be unlinked.")) return;

    try {
      const res = await fetch(`/api/orgs/${orgId}/goals/${goalId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete goal");
        return;
      }
      toast.success("Goal deleted");
      await mutate();
    } catch {
      toast.error("Failed to delete goal");
    }
  }

  const rootGoals = (goals || []).filter((g) => !g.parentId);
  const groupedRoots: Record<string, GoalNode[]> = {};
  for (const lvl of LEVEL_ORDER) {
    const items = rootGoals.filter((g) => g.level === lvl);
    if (items.length > 0) {
      groupedRoots[lvl] = items;
    }
  }

  return (
    <div data-testid="goal-tree">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Align work to strategic objectives
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="goal-create-btn">
          <Plus className="h-4 w-4 mr-2" />
          Create Goal
        </Button>
      </div>

      {!goals ? (
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Target className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>No goals yet. Create your first goal to align agent work.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {LEVEL_ORDER.map((lvl) => {
            const items = groupedRoots[lvl];
            if (!items) return null;
            return (
              <div key={lvl}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  {lvl} Goals
                </h2>
                <div className="border rounded-lg divide-y">
                  {items.map((goal) => (
                    <GoalNodeRow
                      key={goal.id}
                      goal={goal}
                      allGoals={goals}
                      onDelete={handleDelete}
                      onEdit={handleOpenEdit}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editGoal ? "Edit Goal" : "Create Goal"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal-title">Title</Label>
              <Input
                id="goal-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Launch MVP by Q2"
                data-testid="goal-title-input"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="goal-description">Description</Label>
              <Textarea
                id="goal-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the goal and its success criteria"
                data-testid="goal-description-input"
              />
            </div>

            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label>Level</Label>
                <Select value={level} onValueChange={setLevel}>
                  <SelectTrigger data-testid="goal-level-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">Company</SelectItem>
                    <SelectItem value="team">Team</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger data-testid="goal-status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {goals && goals.length > 0 && (
              <div className="space-y-2">
                <Label>Parent Goal (optional)</Label>
                <Select value={parentId || "none"} onValueChange={(v) => setParentId(v === "none" ? "" : v)}>
                  <SelectTrigger data-testid="goal-parent-select">
                    <SelectValue placeholder="No parent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent</SelectItem>
                    {goals
                      .filter((g) => g.id !== editGoal?.id)
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          [{g.level}] {g.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !title.trim()} data-testid="goal-save-btn">
              {saving ? "Saving..." : editGoal ? "Save Changes" : "Create Goal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

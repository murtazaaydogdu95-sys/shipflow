"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Play, CheckCircle, Zap } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Sprint {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string | Date | null;
  endDate: string | Date | null;
  _count: { stories: number };
  stories: Array<{ storyPoints: number | null; status: string }>;
}

interface SprintManagerProps {
  sprints: Sprint[];
  backlogStories: unknown[];
  projectId: string;
}

export function SprintManager({ sprints, backlogStories, projectId }: SprintManagerProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
      const res = await fetch(`/api/projects/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, goal, startDate, endDate }),
      });
      if (!res.ok) throw new Error();
      toast.success("Sprint created!");
      setCreateOpen(false);
      setName("");
      setGoal("");
      router.refresh();
    } catch {
      toast.error("Failed to create sprint");
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(sprintId: string, status: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/sprints/${sprintId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed");
      }
      toast.success(`Sprint ${status.toLowerCase()}`);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update sprint");
    }
  }

  function getSprintStats(sprint: Sprint) {
    const totalPoints = sprint.stories.reduce((sum, s) => sum + (s.storyPoints || 0), 0);
    const donePoints = sprint.stories
      .filter((s) => s.status === "DONE")
      .reduce((sum, s) => sum + (s.storyPoints || 0), 0);
    const progress = totalPoints > 0 ? (donePoints / totalPoints) * 100 : 0;
    return { totalPoints, donePoints, progress };
  }

  const activeSprint = sprints.find((s) => s.status === "ACTIVE");
  const planningSprints = sprints.filter((s) => s.status === "PLANNING");
  const completedSprints = sprints.filter((s) => s.status === "COMPLETED");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sprints</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {backlogStories.length} stories in backlog
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Sprint
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Sprint</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <Label htmlFor="sprint-name">Sprint Name</Label>
                <Input
                  id="sprint-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={`Sprint ${sprints.length + 1}`}
                  required
                />
              </div>
              <div>
                <Label htmlFor="sprint-goal">Goal (optional)</Label>
                <Textarea
                  id="sprint-goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="What do you want to accomplish?"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating..." : "Create Sprint"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Sprint */}
      {activeSprint && (
        <Card className="border-primary/50">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <CardTitle>{activeSprint.name}</CardTitle>
                <Badge className="bg-green-500">Active</Badge>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(activeSprint.id, "COMPLETED")}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Sprint
              </Button>
            </div>
            {activeSprint.goal && (
              <CardDescription>{activeSprint.goal}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {(() => {
              const stats = getSprintStats(activeSprint);
              return (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>
                      {stats.donePoints} / {stats.totalPoints} points completed
                    </span>
                    <span>{activeSprint._count.stories} stories</span>
                  </div>
                  <Progress value={stats.progress} />
                </div>
              );
            })()}
          </CardContent>
        </Card>
      )}

      {/* Planning Sprints */}
      {planningSprints.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Planning</h2>
          <div className="space-y-3">
            {planningSprints.map((sprint) => (
              <Card key={sprint.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{sprint.name}</CardTitle>
                    <div className="flex gap-2">
                      {!activeSprint && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusChange(sprint.id, "ACTIVE")}
                        >
                          <Play className="mr-1 h-3 w-3" />
                          Start
                        </Button>
                      )}
                    </div>
                  </div>
                  {sprint.goal && (
                    <CardDescription>{sprint.goal}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {sprint._count.stories} stories
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Sprints */}
      {completedSprints.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Completed</h2>
          <div className="space-y-3">
            {completedSprints.map((sprint) => {
              const stats = getSprintStats(sprint);
              return (
                <Card key={sprint.id} className="opacity-75">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{sprint.name}</CardTitle>
                      <Badge variant="secondary">Completed</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {stats.donePoints} / {stats.totalPoints} points completed
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

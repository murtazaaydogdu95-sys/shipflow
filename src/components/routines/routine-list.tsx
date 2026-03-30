"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { RoutineRow, cronToHuman } from "@/components/routines/routine-row";
import type { Routine } from "@/components/routines/routine-row";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COMMON_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

interface RoutineListProps {
  projectId: string;
}

export function RoutineList({ projectId }: RoutineListProps) {
  const {
    data: routines,
    mutate,
    isLoading,
  } = useSWR<Routine[]>(`/api/projects/${projectId}/routines`, fetcher);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  // Create form state
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCron, setFormCron] = useState("0 9 * * 1-5");
  const [formTimezone, setFormTimezone] = useState("UTC");
  const [formPolicy, setFormPolicy] = useState("skip_if_active");
  const [formWebhook, setFormWebhook] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("chore");
  const [formPriority, setFormPriority] = useState("MEDIUM");

  function resetForm() {
    setFormName("");
    setFormDesc("");
    setFormCron("0 9 * * 1-5");
    setFormTimezone("UTC");
    setFormPolicy("skip_if_active");
    setFormWebhook(false);
    setFormTitle("");
    setFormType("chore");
    setFormPriority("MEDIUM");
  }

  async function handleCreate() {
    if (!formName.trim() || !formTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/routines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          cronExpression: formCron.trim(),
          timezone: formTimezone,
          concurrencyPolicy: formPolicy,
          webhookEnabled: formWebhook,
          storyTemplate: {
            title: formTitle.trim(),
            type: formType,
            priority: formPriority,
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await mutate();
      setCreateOpen(false);
      resetForm();
      toast.success("Routine created");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create routine");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(id: string, active: boolean) {
    try {
      const res = await fetch(`/api/projects/${projectId}/routines/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      toast.error("Failed to update routine");
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/projects/${projectId}/routines/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      await mutate();
      toast.success("Routine deleted");
    } catch {
      toast.error("Failed to delete routine");
    }
  }

  async function handleRunNow(id: string) {
    setTriggeringId(id);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/routines/${id}/trigger`,
        { method: "POST" }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      if (result.skipped) {
        toast.info(`Skipped: ${result.skipReason ?? "concurrency policy"}`);
      } else {
        toast.success("Routine triggered -- story created");
      }
      await mutate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to trigger routine");
    } finally {
      setTriggeringId(null);
    }
  }

  return (
    <div data-testid="routine-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {routines ? `${routines.length} routine${routines.length !== 1 ? "s" : ""}` : ""}
        </p>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="routine-create-btn">
              <Plus className="mr-1 h-4 w-4" />
              Create Routine
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Routine</DialogTitle>
              <DialogDescription>
                Define a routine to automatically create stories on a schedule.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Routine Name</Label>
                <Input
                  data-testid="routine-name-input"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Weekly security scan"
                  className="mt-1"
                  maxLength={100}
                />
              </div>
              <div>
                <Label>Description (optional)</Label>
                <Textarea
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What does this routine do?"
                  className="mt-1"
                  rows={2}
                  maxLength={2000}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cron Expression</Label>
                  <Input
                    data-testid="routine-cron-input"
                    value={formCron}
                    onChange={(e) => setFormCron(e.target.value)}
                    placeholder="0 9 * * 1-5"
                    className="mt-1 font-mono"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {cronToHuman(formCron)}
                  </p>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <Select value={formTimezone} onValueChange={setFormTimezone}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Concurrency Policy</Label>
                <Select value={formPolicy} onValueChange={setFormPolicy}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="skip_if_active">Skip if Active</SelectItem>
                    <SelectItem value="always_enqueue">Always Create</SelectItem>
                    <SelectItem value="coalesce_if_active">Coalesce if Active</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formWebhook}
                  onCheckedChange={setFormWebhook}
                  data-testid="routine-webhook-toggle"
                />
                <Label>Enable webhook trigger</Label>
              </div>
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Story Template</h4>
                <div className="space-y-3">
                  <div>
                    <Label>Story Title</Label>
                    <Input
                      data-testid="routine-story-title-input"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Weekly code review"
                      className="mt-1"
                      maxLength={200}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Type</Label>
                      <Select value={formType} onValueChange={setFormType}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="feature">Feature</SelectItem>
                          <SelectItem value="bug">Bug</SelectItem>
                          <SelectItem value="chore">Chore</SelectItem>
                          <SelectItem value="refactor">Refactor</SelectItem>
                          <SelectItem value="docs">Docs</SelectItem>
                          <SelectItem value="test">Test</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Priority</Label>
                      <Select value={formPriority} onValueChange={setFormPriority}>
                        <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleCreate}
                disabled={creating || !formName.trim() || !formTitle.trim()}
                data-testid="routine-create-submit"
              >
                {creating && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                Create Routine
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground text-center py-8">
          Loading routines...
        </p>
      )}

      {routines && routines.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <RefreshCw className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No routines configured yet. Create one to automate story creation.
            </p>
          </CardContent>
        </Card>
      )}

      {routines &&
        routines.length > 0 &&
        routines.map((routine) => (
          <RoutineRow
            key={routine.id}
            routine={routine}
            projectId={projectId}
            expanded={expandedId === routine.id}
            onToggleExpand={() =>
              setExpandedId(expandedId === routine.id ? null : routine.id)
            }
            onToggleActive={(active) => handleToggleActive(routine.id, active)}
            onDelete={() => handleDelete(routine.id)}
            onRunNow={() => handleRunNow(routine.id)}
            triggering={triggeringId === routine.id}
          />
        ))}
    </div>
  );
}

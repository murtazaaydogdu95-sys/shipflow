"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface RecurringStoryEntry {
  id: string;
  title: string;
  description: string | null;
  type: string;
  priority: string;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  active: boolean;
  lastCreatedAt: string | null;
}

interface RecurringStoriesProps {
  projectId: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function RecurringStories({ projectId }: RecurringStoriesProps) {
  const [entries, setEntries] = useState<RecurringStoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newFrequency, setNewFrequency] = useState("weekly");
  const [newDayOfWeek, setNewDayOfWeek] = useState("1");

  useEffect(() => {
    fetch(`/api/projects/${projectId}/recurring`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setEntries(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/recurring`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          frequency: newFrequency,
          dayOfWeek: newFrequency === "weekly" ? Number(newDayOfWeek) : undefined,
          dayOfMonth: newFrequency === "monthly" ? 1 : undefined,
        }),
      });
      if (!res.ok) throw new Error();
      const entry = await res.json();
      setEntries((prev) => [entry, ...prev]);
      setNewTitle("");
      toast.success("Recurring story created");
    } catch {
      toast.error("Failed to create recurring story");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggle(id: string, active: boolean) {
    try {
      await fetch(`/api/projects/${projectId}/recurring/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, active } : e)));
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/projects/${projectId}/recurring/${id}`, { method: "DELETE" });
      setEntries((prev) => prev.filter((e) => e.id !== id));
      toast.success("Deleted");
    } catch {
      toast.error("Failed to delete");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Recurring Stories
        </CardTitle>
        <CardDescription>
          Automatically create stories on a schedule
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Label className="text-xs">Title</Label>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Weekly code review"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-xs">Frequency</Label>
            <Select value={newFrequency} onValueChange={setNewFrequency}>
              <SelectTrigger className="w-28 mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {newFrequency === "weekly" && (
            <div>
              <Label className="text-xs">Day</Label>
              <Select value={newDayOfWeek} onValueChange={setNewDayOfWeek}>
                <SelectTrigger className="w-28 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d, i) => (
                    <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={handleCreate} disabled={creating || !newTitle.trim()}>
            {creating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
            Add
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recurring stories configured.</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Switch
                    checked={entry.active}
                    onCheckedChange={(checked) => handleToggle(entry.id, checked)}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{entry.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.frequency}
                      {entry.frequency === "weekly" && entry.dayOfWeek != null && ` on ${DAYS[entry.dayOfWeek]}`}
                      {entry.lastCreatedAt && ` · Last: ${new Date(entry.lastCreatedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Bot,
  Loader2,
  Pause,
  Play,
  Save,
  Skull,
  DollarSign,
  Clock,
  CheckCircle2,
  HeartPulse,
  FolderOpen,
} from "lucide-react";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Agent {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: string;
  adapterType: string;
  adapterConfig?: { apiKeySet?: boolean; oauthTokenSet?: boolean } | null;
  capabilities: string | null;
  storiesCompleted: number;
  totalCostCents: number;
  lastHeartbeatAt: string | null;
  pauseReason: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AssignedStory {
  id: string;
  shortId: string;
  title: string;
  status: string;
  identifier: string | null;
}

interface Workspace {
  id: string;
  workingDir: string;
  branchName: string | null;
  status: string;
  closedAt: string | null;
  createdAt: string;
}

interface HeartbeatRun {
  id: string;
  source: string;
  status: string;
  startedAt: string | null;
  finishedAt: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  costCents: number | null;
  error: string | null;
  createdAt: string;
}

interface HeartbeatConfig {
  heartbeatInterval: number | null;
  heartbeatCron: string | null;
  nextHeartbeatAt: string | null;
  heartbeatPrompt: string | null;
}

interface CostSummary {
  totalCostCents: number;
  totalTokens: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  invocationCount: number;
  byModel: Array<{ model: string; costCents: number; tokenCount: number }>;
  byDay: Array<{ date: string; costCents: number }>;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  terminated: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const ROLES = [
  { value: "coder", label: "Coder" },
  { value: "tester", label: "Tester" },
  { value: "reviewer", label: "Reviewer" },
  { value: "architect", label: "Architect" },
  { value: "qa", label: "QA" },
  { value: "devops", label: "DevOps" },
  { value: "designer", label: "Designer" },
];

const ADAPTERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
];

function formatCostCents(cents: number): string {
  if (cents < 100) return `${cents}c`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

interface AgentDetailClientProps {
  projectId: string;
  agentId: string;
  orgId: string;
}

export function AgentDetailClient({
  projectId,
  agentId,
  orgId,
}: AgentDetailClientProps) {
  const [activeTab, setActiveTab] = useState("settings");
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const {
    data: agent,
    mutate: mutateAgent,
    isLoading,
  } = useSWR<Agent>(
    orgId ? `/api/orgs/${orgId}/agents/${agentId}` : null,
    fetcher
  );

  // The agent detail endpoint includes assignedStories
  const agentDetail = agent as (Agent & { assignedStories?: AssignedStory[] }) | undefined;
  const stories = activeTab === "activity" ? agentDetail?.assignedStories ?? null : null;

  const { data: costs } = useSWR<CostSummary>(
    activeTab === "cost"
      ? `/api/projects/${projectId}/costs?agentId=${agentId}`
      : null,
    fetcher
  );

  // Heartbeat data: agent config includes heartbeat fields, runs fetched separately
  const agentWithHeartbeat = agent as (Agent & HeartbeatConfig) | undefined;

  const { data: workspaces } = useSWR<Workspace[]>(
    activeTab === "workspaces" && projectId
      ? `/api/projects/${projectId}/workspaces?agentId=${agentId}`
      : null,
    fetcher
  );

  const { data: heartbeatRuns } = useSWR<HeartbeatRun[]>(
    activeTab === "heartbeat" && orgId
      ? `/api/orgs/${orgId}/agents/${agentId}/heartbeat-runs`
      : null,
    fetcher
  );

  const [heartbeatCronInput, setHeartbeatCronInput] = useState("");
  const [heartbeatEnabled, setHeartbeatEnabled] = useState(false);
  const [heartbeatInitialized, setHeartbeatInitialized] = useState(false);
  const [savingHeartbeat, setSavingHeartbeat] = useState(false);

  if (agentWithHeartbeat && !heartbeatInitialized) {
    setHeartbeatCronInput(agentWithHeartbeat.heartbeatCron ?? "");
    setHeartbeatEnabled(
      !!(agentWithHeartbeat.heartbeatCron || agentWithHeartbeat.heartbeatInterval)
    );
    setHeartbeatInitialized(true);
  }

  async function handleSaveHeartbeat() {
    setSavingHeartbeat(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/agents/${agentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          heartbeatCron: heartbeatEnabled ? heartbeatCronInput.trim() || null : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await mutateAgent();
      toast.success("Heartbeat config updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update heartbeat");
    } finally {
      setSavingHeartbeat(false);
    }
  }

  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editAdapter, setEditAdapter] = useState("");
  const [editCapabilities, setEditCapabilities] = useState("");
  const [editApiKey, setEditApiKey] = useState("");
  const [editOauthToken, setEditOauthToken] = useState("");
  const [formInitialized, setFormInitialized] = useState(false);

  // Initialize form when agent data loads
  if (agent && !formInitialized) {
    setEditName(agent.name);
    setEditRole(agent.role);
    setEditTitle(agent.title ?? "");
    setEditAdapter(agent.adapterType);
    setEditCapabilities(agent.capabilities ?? "");
    setFormInitialized(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/agents/${agentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: editName.trim(),
            role: editRole,
            title: editTitle.trim() || null,
            adapterType: editAdapter,
            capabilities: editCapabilities.trim() || null,
            // Only send secrets the user actually typed; blank preserves the stored key.
            ...((editApiKey.trim() || editOauthToken.trim())
              ? {
                  adapterConfig: {
                    ...(editApiKey.trim() ? { apiKey: editApiKey.trim() } : {}),
                    ...(editOauthToken.trim() ? { oauthToken: editOauthToken.trim() } : {}),
                  },
                }
              : {}),
          }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setEditApiKey("");
      setEditOauthToken("");
      await mutateAgent();
      toast.success("Agent updated");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update agent"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handlePause() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/agents/${agentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "paused", pauseReason: "manual" }),
        }
      );
      if (!res.ok) throw new Error();
      await mutateAgent();
      toast.success("Agent paused");
    } catch {
      toast.error("Failed to pause agent");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResume() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/agents/${agentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "idle", pauseReason: null }),
        }
      );
      if (!res.ok) throw new Error();
      await mutateAgent();
      toast.success("Agent resumed");
    } catch {
      toast.error("Failed to resume agent");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleTerminate() {
    setActionLoading(true);
    try {
      const res = await fetch(
        `/api/orgs/${orgId}/agents/${agentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      await mutateAgent();
      toast.success("Agent terminated");
    } catch {
      toast.error("Failed to terminate agent");
    } finally {
      setActionLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        Loading agent...
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-sm text-muted-foreground text-center py-12">
        Agent not found
      </div>
    );
  }

  const isTerminated = agent.status === "terminated";
  const isPaused = agent.status === "paused";

  return (
    <div data-testid="agent-detail">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/agents`}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            <p className="text-sm text-muted-foreground">
              {agent.role}
              {agent.title ? ` -- ${agent.title}` : ""}
            </p>
          </div>
          <Badge
            variant="outline"
            className={STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle}
          >
            {agent.status}
          </Badge>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {!isTerminated && (
            <>
              {isPaused ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResume}
                  disabled={actionLoading}
                  data-testid="agent-resume-btn"
                >
                  <Play className="mr-1 h-4 w-4" />
                  Resume
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePause}
                  disabled={actionLoading}
                  data-testid="agent-pause-btn"
                >
                  <Pause className="mr-1 h-4 w-4" />
                  Pause
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actionLoading}
                    data-testid="agent-terminate-btn"
                  >
                    <Skull className="mr-1 h-4 w-4" />
                    Terminate
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Terminate agent?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently terminate the agent. It will no
                      longer pick up or work on stories. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleTerminate}
                      className="bg-destructive text-destructive-foreground"
                    >
                      Terminate
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{agent.storiesCompleted}</p>
              <p className="text-xs text-muted-foreground">Stories Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">
                {formatCostCents(agent.totalCostCents)}
              </p>
              <p className="text-xs text-muted-foreground">Total Cost</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {agent.lastHeartbeatAt
                  ? new Date(agent.lastHeartbeatAt).toLocaleDateString()
                  : "Never"}
              </p>
              <p className="text-xs text-muted-foreground">Last Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="cost">Cost</TabsTrigger>
          <TabsTrigger value="workspaces" data-testid="agent-workspace-tab">
            <FolderOpen className="mr-1 h-3 w-3" />
            Workspaces
          </TabsTrigger>
          <TabsTrigger value="heartbeat" data-testid="agent-heartbeat-tab">
            <HeartPulse className="mr-1 h-3 w-3" />
            Heartbeat
          </TabsTrigger>
        </TabsList>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  maxLength={50}
                  className="mt-1"
                  disabled={isTerminated}
                  data-testid="agent-edit-name"
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={editRole}
                  onValueChange={setEditRole}
                  disabled={isTerminated}
                >
                  <SelectTrigger className="mt-1" data-testid="agent-edit-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Title (optional)</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  maxLength={200}
                  className="mt-1"
                  disabled={isTerminated}
                  data-testid="agent-edit-title"
                />
              </div>
              <div>
                <Label>Adapter Type</Label>
                <Select
                  value={editAdapter}
                  onValueChange={setEditAdapter}
                  disabled={isTerminated}
                >
                  <SelectTrigger className="mt-1" data-testid="agent-edit-adapter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADAPTERS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(editAdapter === "claude" || editAdapter === "openai") && (
                <div>
                  <Label>
                    API Key
                    {agent.adapterConfig?.apiKeySet && (
                      <span className="ml-2 text-xs text-green-500">✓ configured</span>
                    )}
                  </Label>
                  <Input
                    type="password"
                    value={editApiKey}
                    onChange={(e) => setEditApiKey(e.target.value)}
                    placeholder={
                      agent.adapterConfig?.apiKeySet
                        ? "Leave blank to keep current key"
                        : editAdapter === "openai"
                          ? "sk-..."
                          : "sk-ant-..."
                    }
                    autoComplete="off"
                    className="mt-1"
                    disabled={isTerminated}
                    data-testid="agent-edit-apikey"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Stored encrypted. Used for this agent&apos;s runs (bring your own key).
                  </p>
                </div>
              )}
              {editAdapter === "claude" && (
                <div>
                  <Label>
                    Claude subscription token (optional)
                    {agent.adapterConfig?.oauthTokenSet && (
                      <span className="ml-2 text-xs text-green-500">✓ configured</span>
                    )}
                  </Label>
                  <Input
                    type="password"
                    value={editOauthToken}
                    onChange={(e) => setEditOauthToken(e.target.value)}
                    placeholder={
                      agent.adapterConfig?.oauthTokenSet
                        ? "Leave blank to keep current token"
                        : "From `claude setup-token` (instead of an API key)"
                    }
                    autoComplete="off"
                    className="mt-1"
                    disabled={isTerminated}
                    data-testid="agent-edit-oauth"
                  />
                </div>
              )}
              <div>
                <Label>Capabilities (optional)</Label>
                <Textarea
                  value={editCapabilities}
                  onChange={(e) => setEditCapabilities(e.target.value)}
                  maxLength={1000}
                  className="mt-1"
                  rows={3}
                  disabled={isTerminated}
                  data-testid="agent-edit-capabilities"
                />
              </div>
              {!isTerminated && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  data-testid="agent-save-btn"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Stories</CardTitle>
            </CardHeader>
            <CardContent>
              {!stories && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading stories...
                </p>
              )}
              {stories && stories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No stories assigned to this agent yet.
                </p>
              )}
              {stories && stories.length > 0 && (
                <div className="space-y-2">
                  {stories.map((story) => (
                    <div
                      key={story.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {story.identifier && (
                            <span className="text-muted-foreground font-mono mr-2">
                              {story.identifier}
                            </span>
                          )}
                          {story.title}
                        </p>
                      </div>
                      <Badge variant="outline" className="ml-2 shrink-0">
                        {story.status.replace("_", " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cost Tab */}
        <TabsContent value="cost" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Cost Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {!costs && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading cost data...
                </p>
              )}
              {costs && (
                <div className="space-y-6">
                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold">
                        {formatCostCents(costs.totalCostCents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Cost (30d)
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold">
                        {formatTokenCount(costs.totalTokens)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Total Tokens
                      </p>
                    </div>
                    <div className="rounded-lg border p-3 text-center">
                      <p className="text-xl font-bold">
                        {costs.invocationCount}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Invocations
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* By Model */}
                  {costs.byModel.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">Cost by Model</h4>
                      <div className="space-y-2">
                        {costs.byModel.map((m) => (
                          <div
                            key={m.model}
                            className="flex items-center justify-between rounded-lg border p-3"
                          >
                            <div>
                              <p className="text-sm font-mono">{m.model}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatTokenCount(m.tokenCount)} tokens
                              </p>
                            </div>
                            <p className="text-sm font-medium">
                              {formatCostCents(m.costCents)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* By Day */}
                  {costs.byDay.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-3">
                        Daily Breakdown
                      </h4>
                      <div className="space-y-1">
                        {costs.byDay.slice(-14).map((d) => (
                          <div
                            key={d.date}
                            className="flex items-center justify-between text-sm py-1"
                          >
                            <span className="text-muted-foreground">
                              {d.date}
                            </span>
                            <span className="font-medium">
                              {formatCostCents(d.costCents)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {costs.totalCostCents === 0 &&
                    costs.byModel.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No cost events recorded for this agent yet.
                      </p>
                    )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Workspaces Tab */}
        <TabsContent value="workspaces" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Execution Workspaces</CardTitle>
            </CardHeader>
            <CardContent>
              {!workspaces && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Loading workspaces...
                </p>
              )}
              {workspaces && workspaces.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No workspaces associated with this agent yet.
                </p>
              )}
              {workspaces && workspaces.length > 0 && (
                <div className="space-y-2">
                  {workspaces.map((ws) => (
                    <div
                      key={ws.id}
                      data-testid="workspace-row"
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono truncate">{ws.workingDir}</p>
                        <p className="text-xs text-muted-foreground">
                          {ws.branchName ? `Branch: ${ws.branchName}` : "No branch"}
                          {" -- "}
                          Created {new Date(ws.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          ws.status === "active"
                            ? "bg-green-500/15 text-green-700 border-green-500/30"
                            : "bg-gray-500/15 text-gray-700 border-gray-500/30"
                        }
                      >
                        {ws.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Heartbeat Tab */}
        <TabsContent value="heartbeat" className="mt-4">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Heartbeat Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={heartbeatEnabled}
                    onCheckedChange={setHeartbeatEnabled}
                    disabled={isTerminated}
                    data-testid="heartbeat-enable-toggle"
                  />
                  <Label>Enable scheduled heartbeats</Label>
                </div>
                {heartbeatEnabled && (
                  <div>
                    <Label>Cron Expression</Label>
                    <Input
                      value={heartbeatCronInput}
                      onChange={(e) => setHeartbeatCronInput(e.target.value)}
                      placeholder="*/15 * * * *"
                      className="mt-1 font-mono max-w-xs"
                      disabled={isTerminated}
                      data-testid="heartbeat-cron-input"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Standard 5-field cron format. e.g. &quot;*/15 * * * *&quot; for every 15 minutes
                    </p>
                  </div>
                )}
                {agentWithHeartbeat?.nextHeartbeatAt && heartbeatEnabled && (
                  <p className="text-xs text-muted-foreground">
                    Next heartbeat: {new Date(agentWithHeartbeat.nextHeartbeatAt).toLocaleString()}
                  </p>
                )}
                {!isTerminated && (
                  <Button
                    onClick={handleSaveHeartbeat}
                    disabled={savingHeartbeat}
                    size="sm"
                  >
                    {savingHeartbeat ? (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-1 h-4 w-4" />
                    )}
                    Save Heartbeat Config
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Heartbeat Runs</CardTitle>
              </CardHeader>
              <CardContent>
                {!heartbeatRuns && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Loading heartbeat data...
                  </p>
                )}
                {heartbeatRuns && heartbeatRuns.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No heartbeat runs recorded yet.
                  </p>
                )}
                {heartbeatRuns && heartbeatRuns.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-muted-foreground text-xs">
                          <th className="text-left py-2 pr-3">Status</th>
                          <th className="text-left py-2 pr-3">Source</th>
                          <th className="text-left py-2 pr-3">Duration</th>
                          <th className="text-right py-2 pr-3">Tokens</th>
                          <th className="text-right py-2 pr-3">Cost</th>
                          <th className="text-right py-2">Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {heartbeatRuns.map((run) => {
                          const duration =
                            run.startedAt && run.finishedAt
                              ? Math.round(
                                  (new Date(run.finishedAt).getTime() -
                                    new Date(run.startedAt).getTime()) /
                                    1000
                                )
                              : null;
                          const tokens =
                            (run.inputTokens ?? 0) + (run.outputTokens ?? 0);
                          return (
                            <tr key={run.id} className="border-b last:border-0">
                              <td className="py-2 pr-3">
                                <Badge
                                  variant="outline"
                                  className={
                                    run.status === "succeeded"
                                      ? "bg-green-500/15 text-green-700 border-green-500/30"
                                      : run.status === "failed"
                                      ? "bg-red-500/15 text-red-700 border-red-500/30"
                                      : run.status === "running"
                                      ? "bg-blue-500/15 text-blue-700 border-blue-500/30"
                                      : ""
                                  }
                                >
                                  {run.status}
                                </Badge>
                              </td>
                              <td className="py-2 pr-3">{run.source}</td>
                              <td className="py-2 pr-3">
                                {duration !== null ? `${duration}s` : "--"}
                              </td>
                              <td className="py-2 pr-3 text-right font-mono">
                                {tokens > 0 ? formatTokenCount(tokens) : "--"}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                {run.costCents
                                  ? formatCostCents(run.costCents)
                                  : "--"}
                              </td>
                              <td className="py-2 text-right text-muted-foreground">
                                {new Date(run.createdAt).toLocaleString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

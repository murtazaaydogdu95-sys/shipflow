"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Trash2, Copy, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { RecurringStories } from "@/components/project/recurring-stories";

interface WebhookEntry {
  id: string;
  url: string;
  events: string;
  active: boolean;
  createdAt: string;
}

export default function SettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const [project, setProject] = useState<{
    name: string;
    description: string;
    techStack: string;
    githubRepo: string;
    apiKeyPrefix: string;
    apiKeyLastRotated: string;
    hasApiKey: boolean;
    agentAutoAssign: boolean;
    agentMinPriority: string;
    agentWorkingDir: string;
    maxConcurrentAgents: number;
    aiProvider: string;
    aiApiKey: string;
    isPublic: boolean;
    deployProvider: string;
    deployToken: string;
    deployProjectId: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyLoading, setKeyLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [webhookLoading, setWebhookLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}/webhooks`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setWebhooks(data); })
      .catch(console.error);
  }, [projectId]);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) =>
        setProject({
          name: p.name || "",
          description: p.description || "",
          techStack: p.techStack || "",
          githubRepo: p.githubRepo || "",
          apiKeyPrefix: p.apiKeyPrefix || "",
          apiKeyLastRotated: p.apiKeyLastRotated || "",
          hasApiKey: !!(p.apiKeyHash || p.apiKey),
          agentAutoAssign: p.agentAutoAssign || false,
          agentMinPriority: p.agentMinPriority || "HIGH",
          agentWorkingDir: p.agentWorkingDir || "",
          maxConcurrentAgents: p.maxConcurrentAgents || 1,
          aiProvider: p.aiProvider || "ollama",
          aiApiKey: p.aiApiKey || "",
          isPublic: p.isPublic || false,
          deployProvider: p.deployProvider || "",
          deployToken: p.deployToken || "",
          deployProjectId: p.deployProjectId || "",
        })
      );
  }, [projectId]);

  async function handleSave() {
    if (!project) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          description: project.description,
          techStack: project.techStack,
          githubRepo: project.githubRepo || undefined,
          isPublic: project.isPublic,
          agentAutoAssign: project.agentAutoAssign,
          agentMinPriority: project.agentMinPriority,
          agentWorkingDir: project.agentWorkingDir || undefined,
          maxConcurrentAgents: project.maxConcurrentAgents,
          aiProvider: project.aiProvider,
          aiApiKey: project.aiApiKey || null,
          deployProvider: project.deployProvider || null,
          deployToken: project.deployToken || null,
          deployProjectId: project.deployProjectId || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      toast.success("Settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      toast.success("Project deleted");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete project");
    }
  }

  async function handleGenerateKey(rotate = false) {
    setKeyLoading(true);
    setGeneratedKey(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-key`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rotate ? { rotate: true } : {}),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const data = await res.json();
      setGeneratedKey(data.key);
      setProject((prev) =>
        prev ? { ...prev, hasApiKey: true, apiKeyPrefix: data.prefix, apiKeyLastRotated: new Date().toISOString() } : prev
      );
      toast.success(rotate ? "API key rotated" : "API key generated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate key");
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleRevokeKey() {
    setKeyLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/api-key`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
      setProject((prev) =>
        prev ? { ...prev, hasApiKey: false, apiKeyPrefix: "", apiKeyLastRotated: "" } : prev
      );
      setGeneratedKey(null);
      toast.success("API key revoked");
    } catch {
      toast.error("Failed to revoke API key");
    } finally {
      setKeyLoading(false);
    }
  }

  async function handleAddWebhook() {
    if (!newWebhookUrl) return;
    setWebhookLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: newWebhookUrl,
          events: ["story.created", "story.moved", "story.updated", "agent.completed"],
        }),
      });
      if (!res.ok) throw new Error("Failed to create webhook");
      const wh = await res.json();
      setWebhooks((prev) => [wh, ...prev]);
      setNewWebhookUrl("");
      toast.success("Webhook created");
    } catch {
      toast.error("Failed to create webhook");
    } finally {
      setWebhookLoading(false);
    }
  }

  async function handleDeleteWebhook(webhookId: string) {
    try {
      await fetch(`/api/projects/${projectId}/webhooks/${webhookId}`, { method: "DELETE" });
      setWebhooks((prev) => prev.filter((w) => w.id !== webhookId));
      toast.success("Webhook deleted");
    } catch {
      toast.error("Failed to delete webhook");
    }
  }

  if (!project) return <div className="p-6">Loading...</div>;

  const mcpConfig = JSON.stringify(
    {
      mcpServers: {
        shipflow: {
          command: "node",
          args: ["path/to/shipflow-mcp/dist/index.js"],
          env: {
            SHIPFLOW_API_URL: typeof window !== "undefined" ? window.location.origin : "http://localhost:3000",
            SHIPFLOW_API_KEY: project.hasApiKey ? project.apiKeyPrefix : "<generate-an-api-key>",
            SHIPFLOW_PROJECT_ID: projectId,
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div className="flex-1 p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Project Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your project configuration</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Project Name</Label>
            <Input
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={project.description}
              onChange={(e) => setProject({ ...project, description: e.target.value })}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Tech Stack</Label>
            <Input
              value={project.techStack}
              onChange={(e) => setProject({ ...project, techStack: e.target.value })}
              placeholder="Next.js, TypeScript, Prisma"
              className="mt-1"
            />
          </div>
          <div>
            <Label>GitHub Repository URL</Label>
            <Input
              value={project.githubRepo}
              onChange={(e) => setProject({ ...project, githubRepo: e.target.value })}
              placeholder="https://github.com/user/repo"
              className="mt-1"
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Provider</CardTitle>
          <CardDescription>
            Choose the AI provider for story rewriting
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Provider</Label>
            <Select
              value={project.aiProvider}
              onValueChange={(value) =>
                setProject({ ...project, aiProvider: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                <SelectItem value="ollama">Ollama (Local)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {project.aiProvider === "ollama" ? (
            <div className="rounded-lg bg-muted p-3">
              <p className="text-sm text-muted-foreground">
                No API key needed. Make sure Ollama is running locally:
              </p>
              <pre className="text-xs mt-2 font-mono">ollama serve{"\n"}ollama pull llama3.2</pre>
            </div>
          ) : (
            <div>
              <Label>API Key</Label>
              <Input
                type="password"
                value={project.aiApiKey}
                onChange={(e) =>
                  setProject({ ...project, aiApiKey: e.target.value })
                }
                placeholder={
                  project.aiProvider === "anthropic"
                    ? "sk-ant-... (leave empty to use server default)"
                    : "sk-..."
                }
                className="mt-1 font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground mt-1">
                {project.aiProvider === "anthropic"
                  ? "Add your own key for unlimited rewrites. Falls back to the server key with daily limits if empty."
                  : "Required — enter your OpenAI API key"}
              </p>
            </div>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Claude Code Integration</CardTitle>
          <CardDescription>
            Connect Claude Code to ShipFlow via MCP server
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>API Key</Label>
            {generatedKey ? (
              <div className="mt-1 space-y-2">
                <div className="rounded-lg border border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20 p-3">
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
                    Copy this key now — it won&apos;t be shown again
                  </p>
                  <div className="flex gap-2">
                    <Input value={generatedKey} readOnly className="font-mono text-sm" />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedKey);
                        toast.success("API key copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : project.hasApiKey ? (
              <div className="mt-1 space-y-2">
                <div className="flex gap-2 items-center">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{project.apiKeyPrefix}</code>
                  {project.apiKeyLastRotated && (
                    <span className="text-xs text-muted-foreground">
                      Last rotated: {new Date(project.apiKeyLastRotated).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={keyLoading}>
                        Rotate Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Rotate API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          The current key will be invalidated immediately. Any integrations using it will stop working until updated with the new key.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleGenerateKey(true)}>Rotate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" disabled={keyLoading}>
                        Revoke Key
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Revoke API key?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently invalidate the key. All API and MCP integrations will stop working.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRevokeKey} className="bg-destructive text-destructive-foreground">Revoke</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ) : (
              <div className="mt-1">
                <Button onClick={() => handleGenerateKey(false)} disabled={keyLoading}>
                  {keyLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Generate API Key
                </Button>
              </div>
            )}
          </div>
          <div>
            <Label>MCP Configuration</Label>
            <div className="relative mt-1">
              <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto">
                {mcpConfig}
              </pre>
              <Button
                size="sm"
                variant="secondary"
                className="absolute top-2 right-2"
                onClick={() => {
                  navigator.clipboard.writeText(mcpConfig);
                  toast.success("MCP config copied");
                }}
              >
                <Copy className="mr-1 h-3 w-3" />
                Copy
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Agent Automation</CardTitle>
          <CardDescription>
            Automatically trigger Claude Code when stories move to TODO
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-assign agent</Label>
              <p className="text-sm text-muted-foreground">
                Spawn a Claude Code process for eligible stories
              </p>
            </div>
            <Switch
              checked={project.agentAutoAssign}
              onCheckedChange={(checked) =>
                setProject({ ...project, agentAutoAssign: checked })
              }
            />
          </div>
          <div>
            <Label>Minimum Priority</Label>
            <Select
              value={project.agentMinPriority}
              onValueChange={(value) =>
                setProject({ ...project, agentMinPriority: value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CRITICAL">Critical</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Only trigger for stories at or above this priority
            </p>
          </div>
          <div>
            <Label>Max Concurrent Agents</Label>
            <Select
              value={String(project.maxConcurrentAgents)}
              onValueChange={(value) =>
                setProject({ ...project, maxConcurrentAgents: Number(value) })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 agent</SelectItem>
                <SelectItem value="2">2 agents</SelectItem>
                <SelectItem value="3">3 agents</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Number of stories that can be worked on simultaneously
            </p>
          </div>
          <div>
            <Label>Working Directory</Label>
            <Input
              value={project.agentWorkingDir}
              onChange={(e) =>
                setProject({ ...project, agentWorkingDir: e.target.value })
              }
              placeholder="/absolute/path/to/your/repo"
              className="mt-1 font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Absolute path to the git repository for Claude Code to work in
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Receive HTTP POST notifications when events occur
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="https://example.com/webhook"
              value={newWebhookUrl}
              onChange={(e) => setNewWebhookUrl(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleAddWebhook} disabled={webhookLoading || !newWebhookUrl}>
              <Plus className="mr-1 h-4 w-4" />
              Add
            </Button>
          </div>
          {webhooks.length > 0 && (
            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono truncate">{wh.url}</p>
                    <p className="text-xs text-muted-foreground">
                      Events: {JSON.parse(wh.events).join(", ")}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteWebhook(wh.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
          {webhooks.length === 0 && (
            <p className="text-sm text-muted-foreground">No webhooks configured.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Public Roadmap</CardTitle>
          <CardDescription>
            Make stories from this project visible on the public roadmap
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable public roadmap</Label>
              <p className="text-sm text-muted-foreground">
                Stories will be visible at /roadmap (title and status only)
              </p>
            </div>
            <Switch
              checked={project.isPublic ?? false}
              onCheckedChange={(checked) =>
                setProject({ ...project, isPublic: checked })
              }
            />
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <RecurringStories projectId={projectId} />

      <Card>
        <CardHeader>
          <CardTitle>Deploy Configuration</CardTitle>
          <CardDescription>
            Deploy story branches to a preview environment
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Deploy Provider</Label>
            <Select
              value={project.deployProvider || "none"}
              onValueChange={(value) =>
                setProject({ ...project, deployProvider: value === "none" ? "" : value })
              }
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="vercel">Vercel</SelectItem>
                <SelectItem value="railway">Railway</SelectItem>
                <SelectItem value="fly">Fly.io</SelectItem>
                <SelectItem value="custom">Custom URL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {project.deployProvider && (
            <>
              <div>
                <Label>Deploy Token</Label>
                <Input
                  type="password"
                  value={project.deployToken}
                  onChange={(e) =>
                    setProject({ ...project, deployToken: e.target.value })
                  }
                  placeholder="API token for deploy provider"
                  className="mt-1 font-mono text-sm"
                />
              </div>
              <div>
                <Label>{project.deployProvider === "custom" ? "Webhook URL" : "Project ID"}</Label>
                <Input
                  value={project.deployProjectId}
                  onChange={(e) =>
                    setProject({ ...project, deployProjectId: e.target.value })
                  }
                  placeholder={project.deployProvider === "custom" ? "https://your-deploy-hook.com" : "Project ID on deploy platform"}
                  className="mt-1 font-mono text-sm"
                />
              </div>
            </>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the project and all its stories, sprints, and data.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

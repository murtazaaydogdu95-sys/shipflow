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
import { Save, Trash2, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SettingsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const [project, setProject] = useState<{
    name: string;
    description: string;
    techStack: string;
    githubRepo: string;
    apiKey: string;
    agentAutoAssign: boolean;
    agentMinPriority: string;
    agentWorkingDir: string;
    aiProvider: string;
    aiApiKey: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p) =>
        setProject({
          name: p.name || "",
          description: p.description || "",
          techStack: p.techStack || "",
          githubRepo: p.githubRepo || "",
          apiKey: p.apiKey || "",
          agentAutoAssign: p.agentAutoAssign || false,
          agentMinPriority: p.agentMinPriority || "HIGH",
          agentWorkingDir: p.agentWorkingDir || "",
          aiProvider: p.aiProvider || "anthropic",
          aiApiKey: p.aiApiKey || "",
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
          agentAutoAssign: project.agentAutoAssign,
          agentMinPriority: project.agentMinPriority,
          agentWorkingDir: project.agentWorkingDir || undefined,
          aiProvider: project.aiProvider,
          aiApiKey: project.aiApiKey || null,
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
      router.push("/");
    } catch {
      toast.error("Failed to delete project");
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
            SHIPFLOW_API_KEY: project.apiKey,
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
                  ? "Optional — falls back to the server's ANTHROPIC_API_KEY if empty"
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
            <div className="flex gap-2 mt-1">
              <Input value={project.apiKey} readOnly className="font-mono text-sm" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  navigator.clipboard.writeText(project.apiKey);
                  toast.success("API key copied");
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
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

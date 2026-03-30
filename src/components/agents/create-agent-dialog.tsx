"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface CreateAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  orgId: string;
  onCreated: () => void;
}

const ROLE_TEMPLATES: Record<string, { label: string; defaultName: string; defaultTitle: string; defaultCapabilities: string; description: string }> = {
  coder: {
    label: "Coder",
    defaultName: "Coder Agent",
    defaultTitle: "Software Engineer",
    defaultCapabilities: "TypeScript, React, Next.js, Node.js, API development, database queries, unit testing",
    description: "Writes clean, production-ready code. Implements features, fixes bugs, and follows project conventions. Creates branches, commits, and submits for review.",
  },
  tester: {
    label: "Tester",
    defaultName: "Test Agent",
    defaultTitle: "QA Engineer",
    defaultCapabilities: "Vitest, Playwright, E2E testing, unit testing, integration testing, test data setup",
    description: "Writes comprehensive tests for new and existing features. Covers happy paths, edge cases, error handling, and regression scenarios.",
  },
  reviewer: {
    label: "Reviewer",
    defaultName: "Review Agent",
    defaultTitle: "Code Reviewer",
    defaultCapabilities: "Code review, security analysis, performance review, best practices, OWASP top 10",
    description: "Reviews code changes for quality, security, and performance issues. Identifies bugs, suggests improvements, and enforces coding standards.",
  },
  architect: {
    label: "Architect",
    defaultName: "Architect Agent",
    defaultTitle: "Software Architect",
    defaultCapabilities: "System design, API design, database modeling, scalability, design patterns, technical decisions",
    description: "Designs system architecture and technical approaches. Evaluates tradeoffs, proposes file structures, and ensures patterns are reused consistently.",
  },
  qa: {
    label: "QA",
    defaultName: "QA Agent",
    defaultTitle: "Quality Assurance Specialist",
    defaultCapabilities: "Manual testing, exploratory testing, bug reporting, acceptance criteria validation, UX review",
    description: "Validates features against acceptance criteria. Tests user flows end-to-end, identifies UX issues, and verifies edge cases are handled.",
  },
  devops: {
    label: "DevOps",
    defaultName: "DevOps Agent",
    defaultTitle: "DevOps Engineer",
    defaultCapabilities: "CI/CD, Docker, deployment, monitoring, infrastructure, GitHub Actions, environment setup",
    description: "Manages deployment pipelines, infrastructure configuration, and environment setup. Optimizes build processes and monitors application health.",
  },
  designer: {
    label: "Designer",
    defaultName: "Design Agent",
    defaultTitle: "UI/UX Designer",
    defaultCapabilities: "Tailwind CSS, responsive design, accessibility, component design, design systems, shadcn/ui",
    description: "Creates and improves UI components following design system conventions. Ensures responsive layouts, accessibility compliance, and visual consistency.",
  },
  pentester: {
    label: "Pen Tester",
    defaultName: "Security Agent",
    defaultTitle: "Penetration Tester",
    defaultCapabilities: "OWASP top 10, XSS, CSRF, SQL injection, IDOR, SSRF, auth bypass, rate limiting, input validation, secret scanning",
    description: "Performs security testing against the application. Identifies vulnerabilities like injection flaws, broken auth, data exposure, and misconfigurations. Reports findings with severity and remediation steps.",
  },
};

const ROLES = Object.entries(ROLE_TEMPLATES).map(([value, t]) => ({ value, label: t.label }));

const ADAPTERS = [
  { value: "claude", label: "Claude (Anthropic)" },
  { value: "openai", label: "OpenAI" },
  { value: "ollama", label: "Ollama (Local)" },
];

export function CreateAgentDialog({
  open,
  onOpenChange,
  orgId,
  onCreated,
}: CreateAgentDialogProps) {
  const [name, setName] = useState(ROLE_TEMPLATES.coder.defaultName);
  const [role, setRole] = useState("coder");
  const [title, setTitle] = useState(ROLE_TEMPLATES.coder.defaultTitle);
  const [adapterType, setAdapterType] = useState("claude");
  const [capabilities, setCapabilities] = useState(ROLE_TEMPLATES.coder.defaultCapabilities);
  const [description, setDescription] = useState(ROLE_TEMPLATES.coder.description);
  const [submitting, setSubmitting] = useState(false);
  const [userEditedName, setUserEditedName] = useState(false);

  function handleRoleChange(newRole: string) {
    const template = ROLE_TEMPLATES[newRole];
    if (!template) return;
    setRole(newRole);
    if (!userEditedName) setName(template.defaultName);
    setTitle(template.defaultTitle);
    setCapabilities(template.defaultCapabilities);
    setDescription(template.description);
  }

  function resetForm() {
    const template = ROLE_TEMPLATES.coder;
    setName(template.defaultName);
    setRole("coder");
    setTitle(template.defaultTitle);
    setAdapterType("claude");
    setCapabilities(template.defaultCapabilities);
    setDescription(template.description);
    setUserEditedName(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Agent name is required");
      return;
    }
    if (name.length > 50) {
      toast.error("Agent name must be 50 characters or fewer");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/orgs/${orgId}/agents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          role,
          title: title.trim() || undefined,
          adapterType,
          capabilities: capabilities.trim() || undefined,
          description: description.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      toast.success("Agent created");
      resetForm();
      onCreated();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create agent"
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Agent</DialogTitle>
          <DialogDescription>
            Add a new AI agent to your project. Agents can automatically work on
            stories based on their role.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="agent-name">Name</Label>
            <Input
              id="agent-name"
              value={name}
              onChange={(e) => { setName(e.target.value); setUserEditedName(true); }}
              placeholder="e.g. Frontend Coder"
              maxLength={50}
              className="mt-1"
              data-testid="agent-name-input"
            />
          </div>

          <div>
            <Label htmlFor="agent-role">Role</Label>
            <Select value={role} onValueChange={handleRoleChange}>
              <SelectTrigger className="mt-1" data-testid="agent-role-select">
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
            <Label htmlFor="agent-description">Description</Label>
            <Textarea
              id="agent-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this agent do? This is included in the agent's prompt context."
              maxLength={500}
              className="mt-1 text-sm"
              rows={3}
              data-testid="agent-description-input"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This description is sent to the AI as context when the agent works on stories.
            </p>
          </div>

          <div>
            <Label htmlFor="agent-title">Title (optional)</Label>
            <Input
              id="agent-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Senior Frontend Developer"
              maxLength={200}
              className="mt-1"
              data-testid="agent-title-input"
            />
          </div>

          <div>
            <Label htmlFor="agent-adapter">Adapter Type</Label>
            <Select value={adapterType} onValueChange={setAdapterType}>
              <SelectTrigger className="mt-1" data-testid="agent-adapter-select">
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

          <div>
            <Label htmlFor="agent-capabilities">Capabilities (optional)</Label>
            <Textarea
              id="agent-capabilities"
              value={capabilities}
              onChange={(e) => setCapabilities(e.target.value)}
              placeholder="e.g. React, TypeScript, testing, API design"
              maxLength={1000}
              className="mt-1"
              rows={3}
              data-testid="agent-capabilities-input"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !name.trim()}
              data-testid="agent-submit-btn"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Agent
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

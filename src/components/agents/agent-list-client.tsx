"use client";

import { useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Plus, Clock, CheckCircle2 } from "lucide-react";
import { CreateAgentDialog } from "@/components/agents/create-agent-dialog";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Agent {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: string;
  adapterType: string;
  capabilities: string | null;
  storiesCompleted: number;
  totalCostCents: number;
  lastHeartbeatAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  terminated: "bg-gray-500/15 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  coder: "Coder",
  tester: "Tester",
  reviewer: "Reviewer",
  architect: "Architect",
  custom: "Custom",
  qa: "QA",
  devops: "DevOps",
  designer: "Designer",
};

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface AgentListClientProps {
  orgId: string;
  projectId: string;
}

export function AgentListClient({ orgId, projectId }: AgentListClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: agents, mutate, isLoading } = useSWR<Agent[]>(
    orgId ? `/api/orgs/${orgId}/agents` : null,
    fetcher
  );

  const agentList = Array.isArray(agents) ? agents : [];

  return (
    <div data-testid="agent-list">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {agentList.length} agent{agentList.length !== 1 ? "s" : ""}
        </p>
        <Button
          onClick={() => setDialogOpen(true)}
          data-testid="create-agent-btn"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Agent
        </Button>
      </div>

      {isLoading && (
        <div className="text-sm text-muted-foreground text-center py-12">
          Loading agents...
        </div>
      )}

      {!isLoading && agentList.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No agents yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              Create an AI agent to automatically work on stories in your
              project. Agents can write code, run tests, and submit reviews.
            </p>
            <Button
              onClick={() => setDialogOpen(true)}
              data-testid="create-agent-btn-empty"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {agentList.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agentList.map((agent) => (
            <Link
              key={agent.id}
              href={`/projects/${projectId}/agents/${agent.id}`}
              data-testid={`agent-card-${agent.name}`}
            >
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{agent.name}</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          {ROLE_LABELS[agent.role] ?? agent.role}
                          {agent.title ? ` -- ${agent.title}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[agent.status] ?? STATUS_COLORS.idle}
                    >
                      {agent.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      {agent.storiesCompleted} completed
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTimeAgo(agent.lastHeartbeatAt)}
                    </span>
                  </div>
                  {agent.capabilities && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {agent.capabilities}
                    </p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CreateAgentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        orgId={orgId}
        onCreated={() => {
          mutate();
          setDialogOpen(false);
        }}
      />
    </div>
  );
}

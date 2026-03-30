"use client";

import { useState, useCallback, DragEvent } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bot, Network, CheckCircle2, Users, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AgentTreeNode {
  id: string;
  name: string;
  role: string;
  title: string | null;
  icon: string | null;
  status: string;
  reportsTo: string | null;
  storiesCompleted: number;
  subordinateCount: number;
}

interface TreeNodeData extends AgentTreeNode {
  children: TreeNodeData[];
}

const STATUS_COLORS: Record<string, string> = {
  idle: "bg-green-500/15 text-green-700 dark:text-green-400 border-green-500/30",
  running: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  paused: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  pending_approval: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
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

function buildTree(agents: AgentTreeNode[]): TreeNodeData[] {
  const map = new Map<string, TreeNodeData>();
  for (const agent of agents) {
    map.set(agent.id, { ...agent, children: [] });
  }

  const roots: TreeNodeData[] = [];
  for (const node of map.values()) {
    if (node.reportsTo && map.has(node.reportsTo)) {
      map.get(node.reportsTo)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function wouldCreateCycle(
  agents: AgentTreeNode[],
  draggedId: string,
  targetId: string
): boolean {
  if (draggedId === targetId) return true;

  // Walk up from targetId; if we reach draggedId, it would create a cycle
  const visited = new Set<string>();
  let current: string | null = targetId;
  while (current) {
    if (current === draggedId) return true;
    if (visited.has(current)) break;
    visited.add(current);
    const agent = agents.find((a) => a.id === current);
    current = agent?.reportsTo ?? null;
  }

  return false;
}

interface OrgChartNodeProps {
  node: TreeNodeData;
  canEdit: boolean;
  allAgents: AgentTreeNode[];
  onReparent: (agentId: string, newParentId: string | null) => void;
  draggedId: string | null;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

function OrgChartNode({
  node,
  canEdit,
  allAgents,
  onReparent,
  draggedId,
  onDragStart,
  onDragEnd,
}: OrgChartNodeProps) {
  const [isOver, setIsOver] = useState(false);
  const router = useRouter();

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", node.id);
    e.dataTransfer.effectAllowed = "move";
    onDragStart(node.id);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (draggedId && draggedId !== node.id) {
      e.dataTransfer.dropEffect = "move";
      setIsOver(true);
    }
  };

  const handleDragLeave = () => {
    setIsOver(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOver(false);
    const droppedId = e.dataTransfer.getData("text/plain");
    if (droppedId && droppedId !== node.id) {
      if (wouldCreateCycle(allAgents, droppedId, node.id)) {
        toast.error("Cannot create circular hierarchy");
        return;
      }
      onReparent(droppedId, node.id);
    }
  };

  return (
    <div className="org-chart-tree-node flex flex-col items-center">
      <div
        data-testid={`org-chart-node-${node.name}`}
        data-testid-drop={`org-chart-drop-zone`}
        className={cn(
          "relative cursor-pointer select-none",
          isOver && "ring-2 ring-primary ring-offset-2 rounded-lg"
        )}
        draggable={canEdit}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={onDragEnd}
        onClick={() => {
          // Navigate to agent detail — find any project this agent is in
          // For org-level agents, link to the org chart itself
          router.push(`/org/org-chart`);
        }}
      >
        <Card className="w-48 hover:border-primary/50 transition-colors">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 shrink-0">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{node.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {ROLE_LABELS[node.role] ?? node.role}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px]",
                  STATUS_COLORS[node.status] ?? STATUS_COLORS.idle
                )}
              >
                {node.status}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle2 className="h-3 w-3" />
                {node.storiesCompleted}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
      {node.children.length > 0 && (
        <div className="org-chart-tree-children flex flex-col items-center">
          <div className="w-px h-6 bg-border" />
          <div className="flex gap-8 relative">
            {node.children.length > 1 && (
              <div
                className="absolute top-0 h-px bg-border"
                style={{
                  left: "calc(50% - " + ((node.children.length - 1) * 56 + (node.children.length - 1) * 32) / 2 + "px)",
                  right: "calc(50% - " + ((node.children.length - 1) * 56 + (node.children.length - 1) * 32) / 2 + "px)",
                }}
              />
            )}
            {node.children.map((child) => (
              <div key={child.id} className="flex flex-col items-center">
                <div className="w-px h-6 bg-border" />
                <OrgChartNode
                  node={child}
                  canEdit={canEdit}
                  allAgents={allAgents}
                  onReparent={onReparent}
                  draggedId={draggedId}
                  onDragStart={onDragStart}
                  onDragEnd={onDragEnd}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function OrgChart() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const { data, mutate, isLoading } = useSWR<AgentTreeNode[]>(
    orgId ? `/api/orgs/${orgId}/agents/tree` : null,
    fetcher
  );

  const agents = Array.isArray(data) ? data : [];
  const tree = buildTree(agents);

  // OWNER and ADMIN can reparent
  const canEdit = true; // Permission checked server-side on PATCH

  const handleReparent = useCallback(
    async (agentId: string, newParentId: string | null) => {
      if (!orgId) return;

      try {
        const res = await fetch(`/api/orgs/${orgId}/agents/${agentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportsTo: newParentId }),
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to update hierarchy");
          return;
        }

        toast.success("Hierarchy updated");
        mutate();
      } catch {
        toast.error("Failed to update hierarchy");
      }
    },
    [orgId, mutate]
  );

  const handleRootDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("text/plain");
    if (droppedId) {
      handleReparent(droppedId, null);
    }
  };

  return (
    <div data-testid="org-chart">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6" />
            Org Chart
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agent hierarchy and reporting structure
          </p>
        </div>
        {agents.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {agents.length} agent{agents.length !== 1 ? "s" : ""}
          </div>
        )}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && agents.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bot className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No agents yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Create agents in your projects to see them in the org chart.
              Agents with reporting relationships will be displayed as a tree.
            </p>
          </CardContent>
        </Card>
      )}

      {!isLoading && agents.length > 0 && (
        <div
          className="overflow-x-auto pb-8"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleRootDrop}
          data-testid="org-chart-drop-zone"
        >
          <div className="flex gap-12 justify-center min-w-max py-4">
            {tree.map((root) => (
              <OrgChartNode
                key={root.id}
                node={root}
                canEdit={canEdit}
                allAgents={agents}
                onReparent={handleReparent}
                draggedId={draggedId}
                onDragStart={setDraggedId}
                onDragEnd={() => setDraggedId(null)}
              />
            ))}
          </div>
        </div>
      )}

      {canEdit && agents.length > 0 && (
        <p className="text-xs text-muted-foreground text-center mt-4">
          Drag and drop agent cards to change reporting relationships.
          Drop on empty space to make an agent a root node.
        </p>
      )}
    </div>
  );
}

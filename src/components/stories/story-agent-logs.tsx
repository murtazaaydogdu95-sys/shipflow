"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollText, Undo2 } from "lucide-react";

interface StoryAgentLogsProps {
  logs: { log?: string; totalLines?: number } | undefined;
  agentStatus: string | null | undefined;
  branchName: string | null | undefined;
  onRevert: () => void;
  reviewLoading: boolean;
}

export function StoryAgentLogs({
  logs,
  agentStatus,
  branchName,
  onRevert,
  reviewLoading,
}: StoryAgentLogsProps) {
  return (
    <>
      <div className="flex items-center gap-2">
        <ScrollText className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Agent Logs</span>
        {agentStatus === "RUNNING" && (
          <Badge variant="secondary" className="text-[10px] animate-pulse">Live</Badge>
        )}
        {logs?.totalLines && logs.totalLines > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">{logs.totalLines} lines</span>
        )}
      </div>
      <pre className="text-xs bg-muted rounded-lg p-4 overflow-auto max-h-[400px] whitespace-pre-wrap font-mono">
        {logs?.log || "No logs available. Agent may not have started yet."}
      </pre>
      {branchName && !agentStatus?.match(/RUNNING|QUEUED/) && (
        <Button variant="outline" size="sm" onClick={onRevert} disabled={reviewLoading}>
          <Undo2 className="mr-2 h-3.5 w-3.5" />
          Revert Agent Work
        </Button>
      )}
    </>
  );
}

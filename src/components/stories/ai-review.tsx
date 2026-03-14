"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Info, AlertTriangle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AIReviewProps {
  projectId: string;
  storyId: string;
}

interface ReviewIssue {
  file: string;
  line: number;
  severity: "info" | "warning" | "error";
  message: string;
  suggestion: string;
}

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10" },
  warning: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  error: { icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
};

export function AIReview({ projectId, storyId }: AIReviewProps) {
  const [running, setRunning] = useState(false);

  const { data, mutate } = useSWR<{
    score: number | null;
    issues: ReviewIssue[] | null;
    reviewedAt: string | null;
  }>(`/api/projects/${projectId}/stories/${storyId}/review`, fetcher);

  async function handleRunReview() {
    setRunning(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/stories/${storyId}/review`,
        { method: "POST" }
      );
      if (!res.ok) throw new Error();
      await mutate();
    } catch {
      // error handled silently
    } finally {
      setRunning(false);
    }
  }

  const score = data?.score;
  const issues = data?.issues;

  const scoreColor =
    score == null
      ? "bg-muted"
      : score >= 80
      ? "bg-green-500"
      : score >= 60
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">AI Code Review</span>
        {score != null && (
          <Badge className={cn(scoreColor, "text-white font-mono")}>
            {score}/100
          </Badge>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleRunReview}
          disabled={running}
          className="ml-auto h-7 text-xs"
        >
          {running ? (
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3 w-3" />
          )}
          {score != null ? "Re-run" : "Run Review"}
        </Button>
      </div>

      {issues && issues.length > 0 && (
        <div className="space-y-1.5">
          {issues.map((issue, i) => {
            const config = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={i}
                className={cn("rounded-lg p-2.5 text-xs", config.bg)}
              >
                <div className="flex items-start gap-2">
                  <Icon className={cn("h-3.5 w-3.5 mt-0.5 shrink-0", config.color)} />
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-muted-foreground truncate">
                        {issue.file}:{issue.line}
                      </span>
                    </div>
                    <p className="font-medium">{issue.message}</p>
                    {issue.suggestion && (
                      <p className="text-muted-foreground">{issue.suggestion}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {score != null && issues?.length === 0 && (
        <p className="text-sm text-muted-foreground">No issues found.</p>
      )}
    </div>
  );
}

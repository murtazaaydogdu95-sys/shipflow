"use client";

import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Loader2,
  Play,
  ChevronDown,
  Trash2,
  Clock,
  Webhook,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export interface RoutineRun {
  id: string;
  status: string;
  storyId: string | null;
  skipReason: string | null;
  source: string;
  createdAt: string;
}

export interface Routine {
  id: string;
  name: string;
  description: string | null;
  cronExpression: string;
  timezone: string;
  concurrencyPolicy: string;
  webhookEnabled: boolean;
  active: boolean;
  lastTriggeredAt: string | null;
  nextTriggerAt: string | null;
  storyTemplate: {
    title: string;
    type?: string;
    priority?: string;
  };
  latestRun: RoutineRun | null;
  totalRuns: number;
  createdAt: string;
}

interface RoutineDetail extends Routine {
  runs: RoutineRun[];
}

const STATUS_COLORS: Record<string, string> = {
  completed: "bg-green-500/15 text-green-700 border-green-500/30",
  running: "bg-blue-500/15 text-blue-700 border-blue-500/30",
  pending: "bg-yellow-500/15 text-yellow-700 border-yellow-500/30",
  skipped: "bg-gray-500/15 text-gray-700 border-gray-500/30",
  failed: "bg-red-500/15 text-red-700 border-red-500/30",
};

const CONCURRENCY_LABELS: Record<string, string> = {
  always_enqueue: "Always Create",
  skip_if_active: "Skip if Active",
  coalesce_if_active: "Coalesce",
};

/**
 * Convert cron expression to a human-readable string.
 */
export function cronToHuman(cron: string): string {
  const parts = cron.split(/\s+/);
  if (parts.length !== 5) return cron;
  const [min, hour, dayM, month, dayW] = parts;
  if (dayW !== "*" && dayM === "*" && month === "*") {
    const days: Record<string, string> = {
      "1": "Mon", "2": "Tue", "3": "Wed", "4": "Thu",
      "5": "Fri", "6": "Sat", "0": "Sun", "7": "Sun",
      "1-5": "Weekdays", "0,6": "Weekends",
    };
    return `${hour}:${min.padStart(2, "0")} ${days[dayW] ?? `day ${dayW}`}`;
  }
  if (dayM !== "*" && month === "*") {
    return `${hour}:${min.padStart(2, "0")} on day ${dayM}`;
  }
  if (dayM === "*" && dayW === "*" && month === "*") {
    if (hour === "*") return `Every minute at :${min.padStart(2, "0")}`;
    return `Daily at ${hour}:${min.padStart(2, "0")}`;
  }
  return cron;
}

interface RoutineRowProps {
  routine: Routine;
  projectId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleActive: (active: boolean) => void;
  onDelete: () => void;
  onRunNow: () => void;
  triggering: boolean;
}

export function RoutineRow({
  routine,
  projectId,
  expanded,
  onToggleExpand,
  onToggleActive,
  onDelete,
  onRunNow,
  triggering,
}: RoutineRowProps) {
  const { data: detail } = useSWR<RoutineDetail>(
    expanded ? `/api/projects/${projectId}/routines/${routine.id}` : null,
    fetcher
  );

  return (
    <Card data-testid="routine-row">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Switch
              checked={routine.active}
              onCheckedChange={onToggleActive}
              data-testid="routine-active-toggle"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm truncate">{routine.name}</CardTitle>
                {routine.webhookEnabled && (
                  <Webhook className="h-3 w-3 text-muted-foreground shrink-0" />
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-mono text-muted-foreground">
                  {routine.cronExpression}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({cronToHuman(routine.cronExpression)})
                </span>
                <Badge variant="outline" className="text-xs">
                  {CONCURRENCY_LABELS[routine.concurrencyPolicy] ?? routine.concurrencyPolicy}
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {routine.nextTriggerAt && routine.active && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(routine.nextTriggerAt).toLocaleString()}
              </div>
            )}
            {routine.latestRun && (
              <Badge
                variant="outline"
                className={STATUS_COLORS[routine.latestRun.status] ?? ""}
              >
                {routine.latestRun.status}
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onRunNow}
              disabled={triggering || !routine.active}
              data-testid="routine-run-now"
            >
              {triggering ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={onDelete} data-testid="routine-delete-btn">
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onToggleExpand}>
              <ChevronDown
                className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="border-t pt-3">
            <h4 className="text-xs font-medium mb-2 text-muted-foreground uppercase">
              Run History ({routine.totalRuns} total)
            </h4>
            {!detail && (
              <p className="text-xs text-muted-foreground">Loading...</p>
            )}
            {detail && detail.runs.length === 0 && (
              <p className="text-xs text-muted-foreground">No runs yet.</p>
            )}
            {detail && detail.runs.length > 0 && (
              <div className="space-y-1">
                {detail.runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${STATUS_COLORS[run.status] ?? ""}`}
                      >
                        {run.status}
                      </Badge>
                      <span className="text-muted-foreground">{run.source}</span>
                      {run.skipReason && (
                        <span className="text-muted-foreground italic">
                          {run.skipReason}
                        </span>
                      )}
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(run.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

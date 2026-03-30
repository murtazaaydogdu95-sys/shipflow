"use client";

import { useEffect } from "react";
import useSWR from "swr";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import type { BurndownResponse } from "@/types";

interface SprintOption {
  id: string;
  name: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface BurndownTabProps {
  projectId: string;
}

export function BurndownTab({ projectId }: BurndownTabProps) {
  const { data: sprintsRaw } = useSWR<SprintOption[]>(
    `/api/projects/${projectId}/sprints`,
    fetcher
  );

  // Filter to sprints with dates
  const sprints = (sprintsRaw ?? []).filter((s) => s.startDate && s.endDate);

  // Default to active sprint, or first available
  const defaultSprintId =
    sprints.find((s) => s.status === "ACTIVE")?.id ?? sprints[0]?.id ?? null;

  // Track selected sprint — synced to default once sprints load
  const { data: selectedState, mutate: setSelected } = useSWR<string | null>(
    `local:burndown-sprint-${projectId}`,
    null,
    { fallbackData: null }
  );
  const selectedSprintId = selectedState ?? defaultSprintId;

  // Auto-select when sprints load
  useEffect(() => {
    if (defaultSprintId && !selectedState) {
      setSelected(defaultSprintId, false);
    }
  }, [defaultSprintId, selectedState, setSelected]);

  const { data: burndown, isLoading: burndownLoading } =
    useSWR<BurndownResponse>(
      selectedSprintId
        ? `/api/projects/${projectId}/sprints/${selectedSprintId}/burndown`
        : null,
      fetcher
    );

  // No sprints with dates
  if (sprintsRaw && sprints.length === 0) {
    return (
      <Card className="mt-4">
        <CardContent className="py-12">
          <p className="text-sm text-muted-foreground text-center">
            No sprints with start and end dates found. Create a sprint with
            dates to see the burndown chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* Sprint selector */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Sprint</span>
        {sprints.length > 0 ? (
          <Select
            value={selectedSprintId ?? ""}
            onValueChange={(val) => setSelected(val, false)}
          >
            <SelectTrigger data-testid="burndown-sprint-select">
              <SelectValue placeholder="Select a sprint" />
            </SelectTrigger>
            <SelectContent>
              {sprints.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                  {s.status === "ACTIVE" ? " (Active)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Skeleton className="h-9 w-48" />
        )}
      </div>

      {/* Summary cards */}
      {burndownLoading ? (
        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="burndown-summary"
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : burndown?.summary ? (
        <div
          className="grid gap-4 md:grid-cols-4"
          data-testid="burndown-summary"
        >
          <SummaryCard
            label="Total Points"
            value={burndown.summary.totalPoints}
          />
          <SummaryCard
            label="Completed"
            value={burndown.summary.completedPoints}
          />
          <SummaryCard
            label="Remaining"
            value={burndown.summary.remainingPoints}
          />
          <SummaryCard
            label="Days Left"
            value={burndown.summary.daysRemaining}
          />
        </div>
      ) : null}

      {/* Burndown chart */}
      {burndownLoading ? (
        <Skeleton className="h-[360px] rounded-lg" />
      ) : burndown ? (
        <BurndownChart burndown={burndown} />
      ) : null}
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function BurndownChart({ burndown }: { burndown: BurndownResponse }) {
  if (burndown.sprint.totalPoints === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-sm text-muted-foreground text-center">
            No story points assigned in this sprint. Assign story points to see
            the burndown chart.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="burndown-chart">
      <CardHeader>
        <CardTitle>Burndown</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={burndown.dataPoints}>
            <CartesianGrid
              strokeDasharray="3 3"
              className="stroke-muted"
            />
            <XAxis
              dataKey="date"
              className="text-xs"
              tickFormatter={(val: string) => {
                const d = new Date(val + "T00:00:00");
                return `${d.getMonth() + 1}/${d.getDate()}`;
              }}
            />
            <YAxis className="text-xs" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="idealRemaining"
              stroke="hsl(var(--muted-foreground))"
              strokeDasharray="5 5"
              name="Ideal"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="actualRemaining"
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              name="Actual"
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

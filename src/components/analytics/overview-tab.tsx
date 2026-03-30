"use client";

import useSWR from "swr";
import { VelocityChart } from "@/components/sprints/velocity-chart";
import { Skeleton } from "@/components/ui/skeleton";

interface OverviewData {
  velocityData: Array<{ name: string; committed: number; completed: number }>;
  storyCounts: Array<{ status: string; _count: number }>;
  priorityCounts: Array<{ priority: string; _count: number }>;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface OverviewTabProps {
  projectId: string;
}

export function OverviewTab({ projectId }: OverviewTabProps) {
  const { data, isLoading } = useSWR<OverviewData>(
    `/api/projects/${projectId}/analytics/overview`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-[340px] rounded-lg" />
        <Skeleton className="h-24 rounded-lg" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6 mt-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {data.storyCounts.map((s) => (
          <div key={s.status} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              {s.status.replace("_", " ")}
            </p>
            <p className="text-2xl font-bold">{s._count}</p>
          </div>
        ))}
      </div>

      <VelocityChart data={data.velocityData} />

      <div>
        <h2 className="text-lg font-semibold mb-3">Stories by Priority</h2>
        <div className="grid gap-2 md:grid-cols-4">
          {data.priorityCounts.map((p) => (
            <div
              key={p.priority}
              className="rounded-lg border p-3 text-center"
            >
              <p className="text-sm font-medium">{p.priority}</p>
              <p className="text-xl font-bold">{p._count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

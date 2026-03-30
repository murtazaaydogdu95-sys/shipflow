"use client";

import useSWR from "swr";
import { DollarSign } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface CostData {
  totalCostCents: number;
  totalTokens: number;
  invocationCount: number;
}

function formatCostCents(cents: number): string {
  if (cents < 100) return `${cents}c`;
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTokenCount(count: number): string {
  if (count < 1000) return String(count);
  if (count < 1_000_000) return `${(count / 1000).toFixed(1)}k`;
  return `${(count / 1_000_000).toFixed(2)}M`;
}

interface StoryCostSummaryProps {
  projectId: string;
  storyId: string;
}

export function StoryCostSummary({ projectId, storyId }: StoryCostSummaryProps) {
  const { data } = useSWR<CostData>(
    `/api/projects/${projectId}/costs?storyId=${storyId}`,
    fetcher
  );

  // Only show if there are cost events
  if (!data || data.totalCostCents === 0) {
    return null;
  }

  return (
    <div data-testid="story-cost-summary">
      <Separator className="my-4" />
      <div className="flex items-center gap-2 mb-2">
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          AI Cost
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span>{formatCostCents(data.totalCostCents)} spent</span>
        <span>{formatTokenCount(data.totalTokens)} tokens</span>
        <span>{data.invocationCount} invocation{data.invocationCount !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}

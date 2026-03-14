"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  ArrowRight,
  Bot,
  GitBranch,
  Loader2,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const activityIcons: Record<string, typeof Plus> = {
  STORY_CREATED: Plus,
  STORY_MOVED: ArrowRight,
  AGENT_TRIGGERED: Bot,
  GIT_PUSH: GitBranch,
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

type ActivityItem = {
  id: string;
  type: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null } | null;
  story: { shortId: string; title: string } | null;
  project: { id: string; name: string; slug: string };
};

export default function ActivityPage() {
  const { data: session } = useSession();
  const orgId = session?.user?.orgId;
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState("all");

  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (projectFilter && projectFilter !== "all") params.set("projectId", projectFilter);

  const { data, isLoading } = useSWR(
    orgId ? `/api/orgs/${orgId}/activity?${params}` : null,
    fetcher
  );

  // Get projects for filter
  const { data: projects } = useSWR("/api/projects", fetcher);

  const activities: ActivityItem[] = data?.activities || [];
  const totalPages = data?.pages || 1;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Activity</h1>
          <p className="text-muted-foreground mt-1">Recent activity across your projects</p>
        </div>
        <Select value={projectFilter} onValueChange={(v) => { setProjectFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects?.map((p: { id: string; name: string }) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!isLoading && activities.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No activity yet. Create some stories to see the feed.
          </p>
        )}
        {activities.map((activity) => {
          const Icon = activityIcons[activity.type] || ArrowRight;
          return (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {activity.user && (
                    <span className="text-sm font-medium">
                      {activity.user.name || "Unknown"}
                    </span>
                  )}
                  <span className="text-sm text-muted-foreground">{activity.message}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {activity.story && (
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {activity.story.shortId}
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">{activity.project.name}</span>
                  <span className="text-xs text-muted-foreground ml-auto">{timeAgo(activity.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

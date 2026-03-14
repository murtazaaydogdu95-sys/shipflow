"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, Circle, Clock, AlertTriangle, Flame } from "lucide-react";
import Link from "next/link";
import type { Story, Label, StoryLabel, AcceptanceCriterion } from "@prisma/client";

type StoryWithProject = Story & {
  labels: (StoryLabel & { label: Label })[];
  acceptanceCriteria: AcceptanceCriterion[];
  project: { id: string; name: string; slug: string };
};

type DoneStory = Story & {
  project: { id: string; name: string; slug: string };
};

const priorityIcons: Record<string, React.ReactNode> = {
  CRITICAL: <Flame className="h-4 w-4 text-red-500" />,
  HIGH: <AlertTriangle className="h-4 w-4 text-orange-500" />,
  MEDIUM: <Circle className="h-4 w-4 text-yellow-500" />,
  LOW: <Circle className="h-4 w-4 text-gray-400" />,
};

const statusColors: Record<string, string> = {
  TODO: "bg-blue-500",
  IN_PROGRESS: "bg-yellow-500",
  REVIEW: "bg-purple-500",
};

interface TodayViewProps {
  stories: StoryWithProject[];
  recentlyDone: DoneStory[];
}

export function TodayView({ stories, recentlyDone }: TodayViewProps) {
  const inProgress = stories.filter((s) => s.status === "IN_PROGRESS");
  const inReview = stories.filter((s) => s.status === "REVIEW");
  const todo = stories.filter((s) => s.status === "TODO");

  return (
    <div className="flex-1 p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Today</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your active stories across all projects, sorted by priority.
        </p>
      </div>

      {stories.length === 0 && (
        <Card className="p-8 text-center">
          <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <p className="text-lg font-medium">All clear!</p>
          <p className="text-sm text-muted-foreground mt-1">No active stories. Time to capture some ideas.</p>
        </Card>
      )}

      {inProgress.length > 0 && (
        <Section title="In Progress" icon={<Clock className="h-4 w-4 text-yellow-500" />} count={inProgress.length}>
          {inProgress.map((s) => <StoryRow key={s.id} story={s} />)}
        </Section>
      )}

      {inReview.length > 0 && (
        <Section title="Needs Review" icon={<Circle className="h-4 w-4 text-purple-500" />} count={inReview.length}>
          {inReview.map((s) => <StoryRow key={s.id} story={s} />)}
        </Section>
      )}

      {todo.length > 0 && (
        <Section title="Up Next" icon={<Circle className="h-4 w-4 text-blue-500" />} count={todo.length}>
          {todo.map((s) => <StoryRow key={s.id} story={s} />)}
        </Section>
      )}

      {recentlyDone.length > 0 && (
        <Section title="Recently Completed" icon={<CheckCircle2 className="h-4 w-4 text-green-500" />} count={recentlyDone.length}>
          {recentlyDone.map((s) => (
            <Link key={s.id} href={`/projects/${s.project.id}`} className="block">
              <Card className="p-3 hover:border-primary/50 transition-colors opacity-60">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-1 line-through">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.project.name}</p>
                  </div>
                  <span className="text-xs text-muted-foreground font-mono">{s.shortId}</span>
                </div>
              </Card>
            </Link>
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold">{title}</h2>
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function StoryRow({ story }: { story: StoryWithProject }) {
  return (
    <Link href={`/projects/${story.project.id}`}>
      <Card className="p-3 hover:border-primary/50 transition-colors">
        <div className="flex items-center gap-3">
          {priorityIcons[story.priority]}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">{story.shortId}</span>
              <Badge className={`text-[10px] px-1 py-0 h-4 text-white ${statusColors[story.status]}`}>
                {story.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-sm font-medium line-clamp-1 mt-0.5">{story.title}</p>
            <p className="text-xs text-muted-foreground">{story.project.name}</p>
          </div>
          {story.storyPoints && (
            <Badge variant="secondary" className="text-xs shrink-0">{story.storyPoints} pts</Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}

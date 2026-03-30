"use client";

import { useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Ban, Trash2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface DependencyData {
  blockedBy: Array<{
    id: string;
    blocker: { id: string; shortId: string; title: string; status: string };
  }>;
  blocking: Array<{
    id: string;
    blocked: { id: string; shortId: string; title: string; status: string };
  }>;
}

interface StoryDependenciesProps {
  depsData: DependencyData | undefined;
  projectId: string;
  storyId: string;
  onAddDependency: (blockerId: string) => void;
  onRemoveDependency: (depId: string) => void;
}

export function StoryDependencies({
  depsData,
  projectId,
  storyId,
  onAddDependency,
  onRemoveDependency,
}: StoryDependenciesProps) {
  return (
    <>
      <div data-testid="deps-list">
        <label className="text-sm font-medium">Blocked By</label>
        {depsData?.blockedBy && depsData.blockedBy.length > 0 ? (
          <div className="mt-2 space-y-1">
            {depsData.blockedBy.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 text-sm rounded border p-2">
                <Ban className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span className="font-mono text-xs text-muted-foreground">{dep.blocker.shortId}</span>
                <span className="flex-1 truncate">{dep.blocker.title}</span>
                <Badge variant={dep.blocker.status === "DONE" ? "default" : "secondary"} className="text-[10px]">
                  {dep.blocker.status}
                </Badge>
                <button onClick={() => onRemoveDependency(dep.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-1">No blockers</p>
        )}
      </div>
      {depsData?.blocking && depsData.blocking.length > 0 && (
        <div>
          <label className="text-sm font-medium">Blocking</label>
          <div className="mt-2 space-y-1">
            {depsData.blocking.map((dep) => (
              <div key={dep.id} className="flex items-center gap-2 text-sm rounded border p-2">
                <span className="font-mono text-xs text-muted-foreground">{dep.blocked.shortId}</span>
                <span className="flex-1 truncate">{dep.blocked.title}</span>
                <Badge variant="secondary" className="text-[10px]">{dep.blocked.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      <div data-testid="deps-add-btn">
        <label className="text-sm font-medium">Add Blocker</label>
        <DependencySearch projectId={projectId} storyId={storyId} onAdd={onAddDependency} />
      </div>
    </>
  );
}

function DependencySearch({ projectId, storyId, onAdd }: { projectId: string; storyId: string; onAdd: (blockerId: string) => void }) {
  const [search, setSearch] = useState("");
  const { data: results } = useSWR<Array<{ id: string; shortId: string; title: string; status: string }>>(
    search.length >= 2 ? `/api/projects/${projectId}/stories?search=${encodeURIComponent(search)}` : null,
    fetcher
  );

  const filtered = results?.filter((s) => s.id !== storyId) ?? [];

  return (
    <div className="mt-1">
      <Input
        placeholder="Search by ID or title..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-8 text-sm"
      />
      {filtered.length > 0 && (
        <div className="mt-1 border rounded max-h-32 overflow-y-auto">
          {filtered.slice(0, 5).map((s) => (
            <button
              key={s.id}
              onClick={() => { onAdd(s.id); setSearch(""); }}
              className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted flex items-center gap-2"
            >
              <span className="font-mono text-xs text-muted-foreground">{s.shortId}</span>
              <span className="truncate flex-1">{s.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

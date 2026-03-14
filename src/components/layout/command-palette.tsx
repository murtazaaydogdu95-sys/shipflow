"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { FolderKanban, FileText, Plus, Settings, Users, BarChart3, Search } from "lucide-react";

interface StoryResult {
  id: string;
  shortId: string;
  title: string;
  status: string;
  priority: string;
  projectId: string;
  project: { name: string };
}

interface ProjectResult {
  id: string;
  name: string;
  slug: string;
  _count: { stories: number };
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreateStory?: () => void;
  projectId?: string;
}

export function CommandPalette({ open, onOpenChange, onCreateStory, projectId }: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [stories, setStories] = useState<StoryResult[]>([]);
  const [projects, setProjects] = useState<ProjectResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Debounced search
  useEffect(() => {
    if (!open || query.length < 1) {
      setStories([]);
      setProjects([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) return;
        const data = await res.json();
        setStories(data.stories || []);
        setProjects(data.projects || []);
      } catch {
        // ignore
      } finally {
        setSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setQuery("");
      setStories([]);
      setProjects([]);
    }
  }, [open]);

  const handleSelect = useCallback((cb: () => void) => {
    onOpenChange(false);
    cb();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search stories, projects, or type a command..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {searching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {stories.length > 0 && (
          <CommandGroup heading="Stories">
            {stories.map((story) => (
              <CommandItem
                key={story.id}
                value={`story-${story.shortId}-${story.title}`}
                onSelect={() =>
                  handleSelect(() =>
                    router.push(`/projects/${story.projectId}?story=${story.id}`)
                  )
                }
              >
                <FileText className="mr-2 h-4 w-4" />
                <span className="font-mono text-xs mr-2">{story.shortId}</span>
                <span className="truncate">{story.title}</span>
                <span className="ml-auto text-xs text-muted-foreground">{story.project.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {projects.length > 0 && (
          <CommandGroup heading="Projects">
            {projects.map((p) => (
              <CommandItem
                key={p.id}
                value={`project-${p.name}`}
                onSelect={() =>
                  handleSelect(() => router.push(`/projects/${p.id}`))
                }
              >
                <FolderKanban className="mr-2 h-4 w-4" />
                <span>{p.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{p._count.stories} stories</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {onCreateStory && (
            <CommandItem
              onSelect={() => handleSelect(() => onCreateStory())}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Story
            </CommandItem>
          )}
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/dashboard"))}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Go to Projects
          </CommandItem>
          {projectId && (
            <>
              <CommandItem
                onSelect={() =>
                  handleSelect(() => router.push(`/projects/${projectId}/settings`))
                }
              >
                <Settings className="mr-2 h-4 w-4" />
                Project Settings
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  handleSelect(() => router.push(`/projects/${projectId}/analytics`))
                }
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Analytics
              </CommandItem>
            </>
          )}
          <CommandItem
            onSelect={() => handleSelect(() => router.push("/org/members"))}
          >
            <Users className="mr-2 h-4 w-4" />
            Manage Members
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

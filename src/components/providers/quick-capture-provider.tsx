"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { QuickCapture } from "@/components/stories/quick-capture";
import { CommandPalette } from "@/components/layout/command-palette";
import type { StoryWithRelations } from "@/types";

interface QuickCaptureContextValue {
  openQuickCapture: () => void;
  openCommandPalette: () => void;
  onStoryCreated: (cb: (story: StoryWithRelations) => void) => () => void;
}

const QuickCaptureContext = createContext<QuickCaptureContextValue | null>(null);

export function useQuickCapture() {
  const ctx = useContext(QuickCaptureContext);
  if (!ctx) throw new Error("useQuickCapture must be used within QuickCaptureProvider");
  return ctx;
}

interface QuickCaptureProviderProps {
  projectId: string;
  children: React.ReactNode;
}

export function QuickCaptureProvider({ projectId, children }: QuickCaptureProviderProps) {
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [techStack, setTechStack] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const listenersRef = useRef<Set<(story: StoryWithRelations) => void>>(new Set());

  // Fetch project data (labels + techStack) once when modal first opens
  useEffect(() => {
    if (!captureOpen || fetched) return;
    (async () => {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (!res.ok) return;
        const project = await res.json();
        setLabels(project.labels ?? []);
        setTechStack(project.techStack ?? null);
        setFetched(true);
      } catch {
        // silently fail — QuickCapture still works without labels
      }
    })();
  }, [captureOpen, fetched, projectId]);

  // Global Cmd+K keyboard shortcut opens command palette
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const openQuickCapture = useCallback(() => setCaptureOpen(true), []);
  const openCommandPalette = useCallback(() => setPaletteOpen(true), []);

  const onStoryCreated = useCallback((cb: (story: StoryWithRelations) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const handleCreated = useCallback((story: StoryWithRelations) => {
    setCaptureOpen(false);
    for (const cb of listenersRef.current) {
      cb(story);
    }
  }, []);

  const handleCreateFromPalette = useCallback(() => {
    setPaletteOpen(false);
    setCaptureOpen(true);
  }, []);

  return (
    <QuickCaptureContext.Provider value={{ openQuickCapture, openCommandPalette, onStoryCreated }}>
      {children}
      <QuickCapture
        open={captureOpen}
        onOpenChange={setCaptureOpen}
        projectId={projectId}
        labels={labels}
        techStack={techStack}
        onCreated={handleCreated}
      />
      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onCreateStory={handleCreateFromPalette}
        projectId={projectId}
      />
    </QuickCaptureContext.Provider>
  );
}

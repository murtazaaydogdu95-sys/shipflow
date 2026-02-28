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
import type { StoryWithRelations } from "@/types";

interface QuickCaptureContextValue {
  openQuickCapture: () => void;
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
  const [open, setOpen] = useState(false);
  const [labels, setLabels] = useState<Array<{ id: string; name: string; color: string }>>([]);
  const [techStack, setTechStack] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);
  const listenersRef = useRef<Set<(story: StoryWithRelations) => void>>(new Set());

  // Fetch project data (labels + techStack) once when modal first opens
  useEffect(() => {
    if (!open || fetched) return;
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
  }, [open, fetched, projectId]);

  // Global Cmd+K keyboard shortcut
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const openQuickCapture = useCallback(() => setOpen(true), []);

  const onStoryCreated = useCallback((cb: (story: StoryWithRelations) => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const handleCreated = useCallback((story: StoryWithRelations) => {
    setOpen(false);
    for (const cb of listenersRef.current) {
      cb(story);
    }
  }, []);

  return (
    <QuickCaptureContext.Provider value={{ openQuickCapture, onStoryCreated }}>
      {children}
      <QuickCapture
        open={open}
        onOpenChange={setOpen}
        projectId={projectId}
        labels={labels}
        techStack={techStack}
        onCreated={handleCreated}
      />
    </QuickCaptureContext.Provider>
  );
}
